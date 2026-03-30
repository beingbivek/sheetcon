// app/api/user/sheets/[id]/data/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mockDataStore } from '@/lib/mock-data-store';

// GET - Fetch all transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify connection belongs to user
    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get transactions from mock store
    const transactions = mockDataStore.getTransactions(id);

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// POST - Add new transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify connection
    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
      },
      include: { user: { include: { tier: true } } },
    });

    if (!connection) {
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

    // Add transaction using mock store
    const newTransaction = mockDataStore.addTransaction(id, body);

    // Increment CRUD count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        crudCountToday: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, transaction: newTransaction });
  } catch (error: any) {
    console.error('Error adding transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add transaction' },
      { status: 500 }
    );
  }
}