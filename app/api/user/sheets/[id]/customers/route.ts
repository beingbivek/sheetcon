// app/api/user/sheets/[id]/customers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readCustomers, appendCustomer } from '@/lib/google-sheet-inventory';

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

async function incrementCrud(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { crudCountToday: { increment: 1 } },
  });
}

// GET - Fetch all customers
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

    const customers = await readCustomers(connection.user.id, connection.spreadsheetId);

    return NextResponse.json({ customers });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST - Add new customer
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

    if (!body.name) {
      return NextResponse.json(
        { error: 'Customer name is required' },
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

    const customer = await appendCustomer(connection.user.id, connection.spreadsheetId, {
      name: body.name,
      phone: body.phone || '',
      email: body.email || '',
      address: body.address || '',
      city: body.city || '',
      notes: body.notes || '',
    });

    await incrementCrud(connection.user.id);

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('Error adding customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add customer' },
      { status: 500 }
    );
  }
}