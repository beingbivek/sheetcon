// app/api/user/sheets/[id]/customers/[customerId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updateCustomer, deleteCustomer, readCustomers } from '@/lib/google-sheet-inventory';

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

// GET - Get single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, customerId } = await params;

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
    const customer = customers.find(c => c.id === customerId);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// PUT - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, customerId } = await params;
    const body = await request.json();

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

    const updated = await updateCustomer(connection.user.id, connection.spreadsheetId, customerId, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      notes: body.notes,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await incrementCrud(connection.user.id);

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE - Delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, customerId } = await params;

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

    const deleted = await deleteCustomer(connection.user.id, connection.spreadsheetId, customerId);

    if (!deleted) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await incrementCrud(connection.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}