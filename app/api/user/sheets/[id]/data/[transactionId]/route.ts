// app/api/user/sheets/[id]/data/[transactionId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mockDataStore } from '@/lib/mock-data-store';

// PUT - Update transaction
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

    console.log('PUT request received:', { id, transactionId, body });

    // Verify connection belongs to user
    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
      },
      include: { user: { include: { tier: true } } },
    });

    if (!connection) {
      console.log('Connection not found for id:', id);
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Check CRUD limits
    const user = connection.user;
    if (user.tier.maxCrudPerDay !== -1 && user.crudCountToday >= user.tier.maxCrudPerDay) {
      return NextResponse.json(
        { error: 'Daily CRUD limit reached. Upgrade your plan to continue.' },
        { status: 429 }
      );
    }

    // Update transaction using mock store
    const updatedTransaction = mockDataStore.updateTransaction(id, transactionId, body);

    if (!updatedTransaction) {
      console.log('Transaction not found:', transactionId);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Increment CRUD count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        crudCountToday: { increment: 1 },
      },
    });

    console.log('Transaction updated successfully:', updatedTransaction);
    return NextResponse.json({ success: true, transaction: updatedTransaction });
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction
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

    console.log('DELETE request received:', { id, transactionId });

    // Verify connection belongs to user
    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
      },
      include: { user: { include: { tier: true } } },
    });

    if (!connection) {
      console.log('Connection not found for id:', id);
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Check CRUD limits
    const user = connection.user;
    if (user.tier.maxCrudPerDay !== -1 && user.crudCountToday >= user.tier.maxCrudPerDay) {
      return NextResponse.json(
        { error: 'Daily CRUD limit reached. Upgrade your plan to continue.' },
        { status: 429 }
      );
    }

    // Delete transaction using mock store
    const deleted = mockDataStore.deleteTransaction(id, transactionId);

    if (!deleted) {
      console.log('Transaction not found for deletion:', transactionId);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Increment CRUD count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        crudCountToday: { increment: 1 },
      },
    });

    console.log('Transaction deleted successfully:', transactionId);
    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}