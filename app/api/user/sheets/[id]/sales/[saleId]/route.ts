// app/api/user/sheets/[id]/sales/[saleId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readSaleById, updateSalePayment, deleteSale } from '@/lib/google-sheet-inventory';

async function checkCrudLimit(user: any): Promise<{ allowed: boolean; error?: string }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastReset = new Date(user.lastCrudReset);
  lastReset.setHours(0, 0, 0, 0);

  if (today > lastReset) {
    await prisma.user.update({
      where: { id: user.id },
      data: { crudCountToday: 0, lastCrudReset: new Date() },
    });
    user.crudCountToday = 0;
  }

  if (user.tier.maxCrudPerDay !== -1 && user.crudCountToday >= user.tier.maxCrudPerDay) {
    return { allowed: false, error: 'Daily CRUD limit reached. Upgrade your plan.' };
  }

  return { allowed: true };
}

async function incrementCrud(userId: string, count: number = 1) {
  await prisma.user.update({
    where: { id: userId },
    data: { crudCountToday: { increment: count } },
  });
}

// GET - Get single sale
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; saleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, saleId } = await params;

    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
        isActive: true,
        templateId: 'inventory',
      },
      include: { user: true },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const sale = await readSaleById(connection.user.id, connection.spreadsheetId, saleId);

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error: any) {
    console.error('Error fetching sale:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sale' },
      { status: 500 }
    );
  }
}

// PUT - Update sale payment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; saleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, saleId } = await params;
    const body = await request.json();

    if (body.amountPaid === undefined) {
      return NextResponse.json(
        { error: 'Amount paid is required' },
        { status: 400 }
      );
    }

    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
        isActive: true,
        templateId: 'inventory',
      },
      include: { user: { include: { tier: true } } },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const crudCheck = await checkCrudLimit(connection.user);
    if (!crudCheck.allowed) {
      return NextResponse.json({ error: crudCheck.error }, { status: 429 });
    }

    const updated = await updateSalePayment(
      connection.user.id,
      connection.spreadsheetId,
      saleId,
      parseFloat(body.amountPaid),
      body.paymentMethod || 'CASH'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    await incrementCrud(connection.user.id);

    return NextResponse.json({ success: true, sale: updated });
  } catch (error: any) {
    console.error('Error updating sale:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update sale' },
      { status: 500 }
    );
  }
}

// DELETE - Delete sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; saleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, saleId } = await params;

    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
        isActive: true,
        templateId: 'inventory',
      },
      include: { user: { include: { tier: true } } },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get sale first to count items for CRUD
    const sale = await readSaleById(connection.user.id, connection.spreadsheetId, saleId);
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const operationsNeeded = 1 + sale.items.length; // Delete + stock restoration
    const crudCheck = await checkCrudLimit(connection.user);
    if (!crudCheck.allowed) {
      return NextResponse.json({ error: crudCheck.error }, { status: 429 });
    }

    const deleted = await deleteSale(connection.user.id, connection.spreadsheetId, saleId);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
    }

    await incrementCrud(connection.user.id, operationsNeeded);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete sale' },
      { status: 500 }
    );
  }
}