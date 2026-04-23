// lib/google-sheet.ts

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/security/errors';
import { queueReadRequest, queueWriteRequest } from './google-sheets-queue';
import {
  getOrFetch,
  getCacheKey,
  CACHE_PREFIX,
  CACHE_TTL,
  invalidateCache,
  invalidateSpreadsheetCache,
} from './cache';

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

const FINANCE_HEADERS = ['ID', 'Date', 'Description', 'Category', 'Type', 'Amount'];

// ═══════════════════════════════════════════════════
// OAUTH CLIENT
// ═══════════════════════════════════════════════════

export async function getOAuth2Client(userId: string): Promise<OAuth2Client> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true, refreshToken: true },
  });

  // User record missing entirely
  if (!user) {
    throw new ApiError(
      'GOOGLE_AUTH_ERROR',
      'User not found. Please sign in again.'
    );
  }

  // User exists but never completed Google OAuth (e.g. seeded test users)
  if (!user.accessToken) {
    throw new ApiError(
      'GOOGLE_AUTH_ERROR',
      'Google account not connected. Please sign out and sign back in with Google to grant Sheets access.'
    );
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken ?? undefined,
  });

  // Persist refreshed tokens automatically
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: tokens.access_token,
          ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
        },
      });
    }
  });

  return oauth2Client;
}

// ═══════════════════════════════════════════════════
// RAW (INTERNAL) FUNCTIONS - NO QUEUE, NO CACHE
// Used inside queued operations to prevent deadlock
// ═══════════════════════════════════════════════════

async function _readTransactionsRaw(
  userId: string,
  spreadsheetId: string,
  sheetName: string = 'Transactions'
): Promise<Transaction[]> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:F`,
    });

    const rows = res.data.values || [];

    return rows.map((row) => ({
      id: row[0] || '',
      date: row[1] || '',
      description: row[2] || '',
      category: row[3] || '',
      type: (row[4] || 'expense') as 'income' | 'expense',
      amount: parseFloat(row[5]) || 0,
    })).filter(t => t.id);
  } catch (err) {
    // Try Sheet1 as fallback for existing sheets not named Transactions
    try {
      const fallbackRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A2:F',
      });

      const rows = fallbackRes.data.values || [];

      return rows.map((row) => ({
        id: row[0] || '',
        date: row[1] || '',
        description: row[2] || '',
        category: row[3] || '',
        type: (row[4] || 'expense') as 'income' | 'expense',
        amount: parseFloat(row[5]) || 0,
      })).filter(t => t.id);
    } catch {
      return [];
    }
  }
}

async function _getSpreadsheetMetadataRaw(
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

// ═══════════════════════════════════════════════════
// QUEUED + CACHED PUBLIC FUNCTIONS
// ═══════════════════════════════════════════════════

// ─── DRIVE: LIST SPREADSHEETS (READ + CACHED) ─────

export async function listUserSpreadsheets(userId: string): Promise<GoogleSheetFile[]> {
  const cacheKey = getCacheKey(CACHE_PREFIX.SPREADSHEETS, userId);

  return getOrFetch(
    cacheKey,
    async () => {
      return queueReadRequest(userId, async () => {
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
      });
    },
    CACHE_TTL.SPREADSHEETS
  );
}

// ─── METADATA (READ + CACHED) ─────────────────────

export async function getSpreadsheetMetadata(
  userId: string,
  spreadsheetId: string
): Promise<SheetMetadata> {
  const cacheKey = getCacheKey(CACHE_PREFIX.METADATA, spreadsheetId);

  return getOrFetch(
    cacheKey,
    async () => {
      return queueReadRequest(userId, async () => {
        return _getSpreadsheetMetadataRaw(userId, spreadsheetId);
      });
    },
    CACHE_TTL.METADATA
  );
}

// ─── READ TRANSACTIONS (READ + CACHED) ────────────

export async function readTransactions(
  userId: string,
  spreadsheetId: string,
  sheetName: string = 'Transactions'
): Promise<Transaction[]> {
  const cacheKey = getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId, sheetName);

  return getOrFetch(
    cacheKey,
    async () => {
      return queueReadRequest(userId, async () => {
        return _readTransactionsRaw(userId, spreadsheetId, sheetName);
      });
    },
    CACHE_TTL.TRANSACTIONS
  );
}

// ─── CREATE FINANCE SPREADSHEET (WRITE) ───────────

export async function createFinanceSpreadsheet(
  userId: string,
  title: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const result = await queueWriteRequest(userId, async () => {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          {
            properties: {
              title: 'Transactions',
              gridProperties: { frozenRowCount: 1 },
            },
          },
        ],
      },
    });

    const spreadsheetId = response.data.spreadsheetId!;
    const actualSheetId = response.data.sheets?.[0]?.properties?.sheetId;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Transactions!A1:F1',
      valueInputOption: 'RAW',
      requestBody: { values: [FINANCE_HEADERS] },
    });

    if (actualSheetId !== undefined) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: actualSheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                  },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.2, green: 0.5, blue: 0.9 },
                      textFormat: {
                        bold: true,
                        foregroundColor: { red: 1, green: 1, blue: 1 },
                      },
                    },
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat)',
                },
              },
            ],
          },
        });
      } catch (formatError) {
        console.warn('Failed to format header row:', formatError);
      }
    }

    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }, 'HIGH');

  await invalidateCache(getCacheKey(CACHE_PREFIX.SPREADSHEETS, userId));

  return result;
}

// ─── INITIALIZE EXISTING SHEET (WRITE) ────────────

export async function initializeExistingSheet(
  userId: string,
  spreadsheetId: string,
  sheetName: string = 'Sheet1'
): Promise<void> {
  return queueWriteRequest(userId, async () => {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:F1`,
    });

    const firstRow = response.data.values?.[0] || [];

    if (firstRow.length === 0 || firstRow[0] !== 'ID') {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:F1`,
        valueInputOption: 'RAW',
        requestBody: { values: [FINANCE_HEADERS] },
      });
    }
  });
}

// ─── APPEND TRANSACTION (WRITE + CACHE INVALIDATE) ─

export async function appendTransaction(
  userId: string,
  spreadsheetId: string,
  transaction: Omit<Transaction, 'id'>,
  sheetName: string = 'Transactions'
): Promise<Transaction> {
  const result = await queueWriteRequest(userId, async () => {
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

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    return { id, ...transaction };
  }, 'HIGH');

  await invalidateCache(getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId, sheetName));
  await invalidateCache(getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId, 'Transactions'));

  return result;
}

// ─── UPDATE TRANSACTION (WRITE + CACHE INVALIDATE) ─

export async function updateTransaction(
  userId: string,
  spreadsheetId: string,
  transactionId: string,
  updates: Partial<Transaction>,
  sheetName: string = 'Transactions'
): Promise<Transaction | null> {
  const result = await queueWriteRequest(userId, async () => {
    const transactions = await _readTransactionsRaw(userId, spreadsheetId, sheetName);
    const index = transactions.findIndex(t => t.id === transactionId);

    if (index === -1) return null;

    const updated = { ...transactions[index], ...updates };
    const rowNumber = index + 2;

    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowNumber}:F${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          updated.id,
          updated.date,
          updated.description,
          updated.category,
          updated.type,
          updated.amount,
        ]],
      },
    });

    return updated;
  }, 'HIGH');

  await invalidateCache(getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId, sheetName));
  await invalidateCache(getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId, 'Transactions'));

  return result;
}

// ─── DELETE TRANSACTION (WRITE + CACHE INVALIDATE) ─

export async function deleteTransaction(
  userId: string,
  spreadsheetId: string,
  transactionId: string,
  sheetName: string = 'Transactions'
): Promise<boolean> {
  const result = await queueWriteRequest(userId, async () => {
    const transactions = await _readTransactionsRaw(userId, spreadsheetId, sheetName);
    const index = transactions.findIndex(t => t.id === transactionId);

    if (index === -1) return false;

    const metadata = await _getSpreadsheetMetadataRaw(userId, spreadsheetId);
    const sheet = metadata.sheets.find(
      s => s.title === sheetName || s.title === 'Sheet1'
    );

    if (!sheet) return false;

    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.sheetId,
              dimension: 'ROWS',
              startIndex: index + 1,
              endIndex: index + 2,
            },
          },
        }],
      },
    });

    return true;
  });

  await invalidateCache(getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId, sheetName));
  await invalidateCache(getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId, 'Transactions'));

  return result;
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId.includes('/')) return urlOrId;

  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Invalid Google Sheets URL');

  return match[1];
}

// Re-export inventory functions
export * from './google-sheet-inventory';