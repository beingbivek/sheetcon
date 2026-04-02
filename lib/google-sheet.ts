// lib/google-sheet.ts

import { google, sheets_v4, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface GoogleSheetFile {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: Array<{
    sheetId: number;
    title: string;
  }>;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
}

// Finance template headers
const FINANCE_HEADERS = ['ID', 'Date', 'Description', 'Category', 'Type', 'Amount'];

// ═══════════════════════════════════════════════════
// OAUTH CLIENT HELPER
// ═══════════════════════════════════════════════════

/**
 * Creates an authenticated OAuth2 client for a user
 */
export async function getOAuth2Client(userId: string): Promise<OAuth2Client> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accessToken: true,
      refreshToken: true,
    },
  });

  if (!user || !user.accessToken) {
    throw new Error('User not authenticated with Google. Please sign in again.');
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || user.refreshToken,
        },
      });
    }
  });

  return oauth2Client;
}

// ═══════════════════════════════════════════════════
// GOOGLE DRIVE FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * List all Google Sheets in user's Drive
 */
export async function listUserSpreadsheets(userId: string): Promise<GoogleSheetFile[]> {
  const auth = await getOAuth2Client(userId);
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'files(id, name, webViewLink)',
    orderBy: 'modifiedTime desc',
    pageSize: 50,
  });

  return (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    webViewLink: file.webViewLink || undefined,
  }));
}

// ═══════════════════════════════════════════════════
// GOOGLE SHEETS FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Get spreadsheet metadata
 */
export async function getSpreadsheetMetadata(
  userId: string,
  spreadsheetId: string
): Promise<SheetMetadata> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'spreadsheetId,properties.title,sheets(properties(sheetId,title))',
  });

  return {
    spreadsheetId: response.data.spreadsheetId!,
    title: response.data.properties?.title || 'Untitled',
    sheets: (response.data.sheets || []).map((sheet) => ({
      sheetId: sheet.properties?.sheetId || 0,
      title: sheet.properties?.title || 'Sheet1',
    })),
  };
}

/**
 * Create a new spreadsheet with finance template structure
 */
export async function createFinanceSpreadsheet(
  userId: string,
  title: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Create spreadsheet
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Transactions',
            gridProperties: {
              frozenRowCount: 1, // Freeze header row
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId!;
  
  // Get the actual sheetId from the response (NOT always 0!)
  const actualSheetId = response.data.sheets?.[0]?.properties?.sheetId;

  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Transactions!A1:F1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [FINANCE_HEADERS],
    },
  });

  // Format header row (bold, background color) - only if we have a valid sheetId
  if (actualSheetId !== undefined) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: actualSheetId,  // Use actual sheetId from response
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.5, blue: 0.9 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        },
      });
    } catch (formatError) {
      // If formatting fails, log but don't fail the whole operation
      console.warn('Failed to format header row:', formatError);
    }
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

/**
 * Initialize an existing spreadsheet with headers if needed
 */
export async function initializeExistingSheet(
  userId: string,
  spreadsheetId: string,
  sheetName: string = 'Sheet1'
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Check if headers exist
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:F1`,
  });

  const firstRow = response.data.values?.[0] || [];

  // If no headers or different headers, add our headers
  if (firstRow.length === 0 || firstRow[0] !== 'ID') {
    // Shift existing data down and add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:F1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [FINANCE_HEADERS],
      },
    });
  }
}

/**
 * Read all transactions from a sheet
 */
export async function readTransactions(
  userId: string,
  spreadsheetId: string,
  sheetName: string = 'Transactions'
): Promise<Transaction[]> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Try the specified sheet name first, fallback to Sheet1
  let range = `${sheetName}!A2:F`;
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    return rows.map((row) => ({
      id: row[0] || '',
      date: row[1] || '',
      description: row[2] || '',
      category: row[3] || '',
      type: (row[4] || 'expense') as 'income' | 'expense',
      amount: parseFloat(row[5]) || 0,
    })).filter(t => t.id); // Filter out empty rows
  } catch (error: any) {
    // If sheet name doesn't exist, try Sheet1
    if (error.message?.includes('Unable to parse range')) {
      const fallbackResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A2:F',
      });

      const rows = fallbackResponse.data.values || [];

      return rows.map((row) => ({
        id: row[0] || '',
        date: row[1] || '',
        description: row[2] || '',
        category: row[3] || '',
        type: (row[4] || 'expense') as 'income' | 'expense',
        amount: parseFloat(row[5]) || 0,
      })).filter(t => t.id);
    }
    throw error;
  }
}

/**
 * Append a new transaction to the sheet
 */
export async function appendTransaction(
  userId: string,
  spreadsheetId: string,
  transaction: Omit<Transaction, 'id'>,
  sheetName: string = 'Transactions'
): Promise<Transaction> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const id = `TXN-${Date.now()}`;
  const row = [
    id,
    transaction.date,
    transaction.description,
    transaction.category,
    transaction.type,
    transaction.amount,
  ];

  // Try specified sheet, fallback to Sheet1
  let range = `${sheetName}!A:F`;
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:F',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [row],
        },
      });
    } else {
      throw error;
    }
  }

  return {
    id,
    ...transaction,
  };
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(
  userId: string,
  spreadsheetId: string,
  transactionId: string,
  updates: Partial<Transaction>,
  sheetName: string = 'Transactions'
): Promise<Transaction | null> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Read all transactions to find the row
  const transactions = await readTransactions(userId, spreadsheetId, sheetName);
  const index = transactions.findIndex((t) => t.id === transactionId);

  if (index === -1) {
    return null;
  }

  const rowNumber = index + 2; // +1 for header, +1 for 0-based index
  const updatedTransaction = { ...transactions[index], ...updates, id: transactionId };

  const row = [
    updatedTransaction.id,
    updatedTransaction.date,
    updatedTransaction.description,
    updatedTransaction.category,
    updatedTransaction.type,
    updatedTransaction.amount,
  ];

  // Try specified sheet, fallback to Sheet1
  let range = `${sheetName}!A${rowNumber}:F${rowNumber}`;
  
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!A${rowNumber}:F${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });
    } else {
      throw error;
    }
  }

  return updatedTransaction;
}

/**
 * Delete a transaction (clear the row)
 */
export async function deleteTransaction(
  userId: string,
  spreadsheetId: string,
  transactionId: string,
  sheetName: string = 'Transactions'
): Promise<boolean> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Read all transactions to find the row
  const transactions = await readTransactions(userId, spreadsheetId, sheetName);
  const index = transactions.findIndex((t) => t.id === transactionId);

  if (index === -1) {
    return false;
  }

  const rowNumber = index + 2; // +1 for header, +1 for 0-based index

  // Get spreadsheet metadata to find sheet ID
  const metadata = await getSpreadsheetMetadata(userId, spreadsheetId);
  const sheet = metadata.sheets.find(
    (s) => s.title === sheetName || s.title === 'Sheet1'
  );

  if (!sheet) {
    return false;
  }

  // Delete the row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // 0-based
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });

  return true;
}

/**
 * Extract spreadsheet ID from URL
 */
export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId.includes('/')) {
    return urlOrId;
  }

  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return match[1];
  }

  throw new Error('Invalid Google Sheets URL');
}

// Re-export inventory functions for convenience
export * from './google-sheet-inventory';