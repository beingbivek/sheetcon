// app/api/user/sheets/[id]/data/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  verifySheetOwnershipByEmail,
  checkAndIncrementCrudLimit,
  requireRateLimit,
  validateInput,
  transactionCreateSchema,
  errorResponse,
} from '@/lib/security';
import { readTransactions, appendTransaction } from '@/lib/google-sheet';
import { prisma } from '@/lib/db';

// GET - Fetch all transactions from Google Sheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');
    
    const { id } = await params;
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);
    
    const transactions = await readTransactions(
      connection.user.id,
      connection.spreadsheetId
    );

    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { 
        lastSyncedAt: new Date(),
        syncStatus: 'ACTIVE',
        syncError: null,
      },
    });

    return NextResponse.json({ transactions });
  } catch (error: unknown) {
    try {
      const { id } = await params;
      await prisma.sheetConnection.update({
        where: { id },
        data: { 
          syncStatus: 'ERROR',
          syncError: error instanceof Error ? error.message : 'Unknown error',
        },
      }).catch(() => {});
    } catch {}
    
    return errorResponse(error);
  }
}

// POST - Add new transaction to Google Sheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'api');
    
    const { id } = await params;
    const rawBody = await request.json();
    const body = validateInput(transactionCreateSchema, rawBody);
    
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);
    
    await checkAndIncrementCrudLimit(connection.user.id);
    
    const newTransaction = await appendTransaction(
      connection.user.id,
      connection.spreadsheetId,
      {
        date: body.date,
        description: body.description,
        category: body.category,
        type: body.type,
        amount: body.amount,
      }
    );

    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({ success: true, transaction: newTransaction });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}