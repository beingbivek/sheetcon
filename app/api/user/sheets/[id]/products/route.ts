// app/api/user/sheets/[id]/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readProducts, appendProduct } from '@/lib/google-sheet-inventory';

// Helper to check and increment CRUD
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

// GET - Fetch all products
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

    const products = await readProducts(connection.user.id, connection.spreadsheetId);

    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), syncStatus: 'ACTIVE' },
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Add new product
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
    if (!body.name || body.sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'Name and selling price are required' },
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

    // Check CRUD limit
    const crudCheck = await checkCrudLimit(connection.user);
    if (!crudCheck.allowed) {
      return NextResponse.json({ error: crudCheck.error }, { status: 429 });
    }

    const product = await appendProduct(connection.user.id, connection.spreadsheetId, {
      name: body.name,
      sku: body.sku || '',
      category: body.category || '',
      description: body.description || '',
      costPrice: parseFloat(body.costPrice) || 0,
      sellingPrice: parseFloat(body.sellingPrice) || 0,
      stock: parseInt(body.stock) || 0,
      minStock: parseInt(body.minStock) || 5,
      unit: body.unit || 'pcs',
    });

    await incrementCrud(connection.user.id);

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('Error adding product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add product' },
      { status: 500 }
    );
  }
}