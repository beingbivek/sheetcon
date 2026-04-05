// app/api/user/sheets/[id]/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  verifySheetOwnershipByEmail,
  checkAndIncrementCrudLimit,
  requireRateLimit,
  validateInput,
  productCreateSchema,
  errorResponse,
} from '@/lib/security';
import { prisma } from '@/lib/db';
import { readProducts, appendProduct } from '@/lib/google-sheet-inventory';

// GET - Fetch all products
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');
    
    const { id } = await params;
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);
    
    if (connection.templateId !== 'inventory') {
      return NextResponse.json(
        { error: 'This sheet is not using the inventory template', code: 'INVALID_TEMPLATE' },
        { status: 400 }
      );
    }
    
    const products = await readProducts(connection.user.id, connection.spreadsheetId);

    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), syncStatus: 'ACTIVE' },
    });

    return NextResponse.json({ products });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

// POST - Add new product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'api');
    
    const { id } = await params;
    const rawBody = await request.json();
    const body = validateInput(productCreateSchema, rawBody);
    
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);
    
    if (connection.templateId !== 'inventory') {
      return NextResponse.json(
        { error: 'This sheet is not using the inventory template', code: 'INVALID_TEMPLATE' },
        { status: 400 }
      );
    }
    
    await checkAndIncrementCrudLimit(connection.user.id);
    
    const product = await appendProduct(connection.user.id, connection.spreadsheetId, body);

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}