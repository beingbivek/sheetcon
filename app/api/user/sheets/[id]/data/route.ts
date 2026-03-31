// app/api/user/sheets/[id]/data/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readTransactions, appendTransaction } from '@/lib/google-sheet';

// GET - Fetch all transactions from Google Sheet
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
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Read transactions from Google Sheet
    const transactions = await readTransactions(
      connection.user.id,
      connection.spreadsheetId
    );

    // Update last synced
    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { 
        lastSyncedAt: new Date(),
        syncStatus: 'ACTIVE',
        syncError: null,
      },
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Error fetching data:', error);

    // Update sync error status
    const { id } = await params;
    await prisma.sheetConnection.update({
      where: { id },
      data: { 
        syncStatus: 'ERROR',
        syncError: error.message,
      },
    }).catch(() => {}); // Ignore if update fails

    if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
      return NextResponse.json(
        { error: 'Google session expired. Please sign out and sign in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// POST - Add new transaction to Google Sheet
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

    // Validate required fields
    if (!body.date || !body.description || !body.category || !body.type || body.amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify connection
    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
        isActive: true,
      },
      include: { user: { include: { tier: true } } },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Check CRUD limits
    const user = connection.user;
    
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
      return NextResponse.json(
        { error: 'Daily CRUD limit reached. Upgrade your plan to continue.' },
        { status: 429 }
      );
    }

    // Add transaction to Google Sheet
    const newTransaction = await appendTransaction(
      user.id,
      connection.spreadsheetId,
      {
        date: body.date,
        description: body.description,
        category: body.category,
        type: body.type,
        amount: parseFloat(body.amount),
      }
    );

    // Increment CRUD count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        crudCountToday: { increment: 1 },
      },
    });

    // Update last synced
    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({ success: true, transaction: newTransaction });
  } catch (error: any) {
    console.error('Error adding transaction:', error);

    if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
      return NextResponse.json(
        { error: 'Google session expired. Please sign out and sign in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add transaction' },
      { status: 500 }
    );
  }
}