// app/api/user/sheets/[id]/sales/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readSales, createSale } from '@/lib/google-sheet-inventory';

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

// GET - Fetch all sales
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

    const sales = await readSales(connection.user.id, connection.spreadsheetId);

    return NextResponse.json({ sales });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}

// POST - Create new sale/invoice
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
    if (!body.customerId || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Customer and at least one item are required' },
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

    // Check CRUD limit (count = 1 for sale + number of items for stock updates)
    const operationsNeeded = 1 + body.items.length;
    const crudCheck = await checkCrudLimit(connection.user);
    if (!crudCheck.allowed) {
      return NextResponse.json({ error: crudCheck.error }, { status: 429 });
    }

    // Calculate totals
    const items = body.items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: parseInt(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      discount: parseFloat(item.discount) || 0,
      total: ((parseInt(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0)) - (parseFloat(item.discount) || 0),
    }));

    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const discountPercent = parseFloat(body.discountPercent) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const taxPercent = parseFloat(body.taxPercent) || 0;
    const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;
    const total = subtotal - discountAmount + taxAmount;
    const amountPaid = parseFloat(body.amountPaid) || 0;
    const amountDue = total - amountPaid;

    const sale = await createSale(connection.user.id, connection.spreadsheetId, {
      date: body.date || new Date().toISOString().split('T')[0],
      customerId: body.customerId,
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      subtotal,
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      total,
      paymentMethod: body.paymentMethod || 'CASH',
      paymentStatus: amountDue <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID',
      amountPaid,
      amountDue: Math.max(0, amountDue),
      notes: body.notes || '',
      items,
    });

    await incrementCrud(connection.user.id, operationsNeeded);

    return NextResponse.json({ success: true, sale });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create sale' },
      { status: 500 }
    );
  }
}