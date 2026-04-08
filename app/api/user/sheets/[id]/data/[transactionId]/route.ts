// app/api/user/sheets/[id]/data/[transactionId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updateTransaction, deleteTransaction } from '@/lib/google-sheet';

// Helper to check CRUD limits
async function checkAndIncrementCrud(user: any): Promise<{ allowed: boolean; error?: string }> {
  // Reset daily count if new day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastReset = new Date(user.lastCrudReset);
  lastReset.setHours(0, 0, 0, 0);

  if (today > lastReset) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        crudCountToday: 0,
        lastCrudReset: new Date(),
      },
    });
    user.crudCountToday = 0;
  }

  if (user.tier.maxCrudPerDay !== -1 && user.crudCountToday >= user.tier.maxCrudPerDay) {
    return { allowed: false, error: 'Daily CRUD limit reached. Upgrade your plan to continue.' };
  }

  // Increment count
  await prisma.user.update({
    where: { id: user.id },
    data: {
      crudCountToday: { increment: 1 },
    },
  });

  return { allowed: true };
}

// PUT - Update transaction in Google Sheet
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, transactionId } = await params;
    const body = await request.json();

    console.log('PUT request:', { id, transactionId, body });

    // Verify connection belongs to user
    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
        isActive: true,
      },
      include: { user: { include: { tier: true } } },
    });

    if (!connection) {
      console.log('Connection not found:', id);
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Check CRUD limits
    const crudCheck = await checkAndIncrementCrud(connection.user);
    if (!crudCheck.allowed) {
      return NextResponse.json({ error: crudCheck.error }, { status: 429 });
    }

    // Update transaction in Google Sheet
    const updatedTransaction = await updateTransaction(
      connection.user.id,
      connection.spreadsheetId,
      transactionId,
      {
        date: body.date,
        description: body.description,
        category: body.category,
        type: body.type,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
      }
    );

    if (!updatedTransaction) {
      console.log('Transaction not found:', transactionId);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update last synced
    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date() },
    });

    console.log('Transaction updated successfully:', updatedTransaction);
    return NextResponse.json({ success: true, transaction: updatedTransaction });
  } catch (error: any) {
    console.error('Error updating transaction:', error);

    if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
      return NextResponse.json(
        { error: 'Google session expired. Please sign out and sign in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction from Google Sheet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, transactionId } = await params;

    console.log('DELETE request:', { id, transactionId });

    // Verify connection belongs to user
    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
        isActive: true,
      },
      include: { user: { include: { tier: true } } },
    });

    if (!connection) {
      console.log('Connection not found:', id);
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Check CRUD limits
    const crudCheck = await checkAndIncrementCrud(connection.user);
    if (!crudCheck.allowed) {
      return NextResponse.json({ error: crudCheck.error }, { status: 429 });
    }

    // Delete transaction from Google Sheet
    const deleted = await deleteTransaction(
      connection.user.id,
      connection.spreadsheetId,
      transactionId
    );

    if (!deleted) {
      console.log('Transaction not found for deletion:', transactionId);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update last synced
    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date() },
    });

    console.log('Transaction deleted successfully:', transactionId);
    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);

    if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
      return NextResponse.json(
        { error: 'Google session expired. Please sign out and sign in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}