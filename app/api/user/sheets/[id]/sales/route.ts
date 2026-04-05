// app/api/user/sheets/[id]/sales/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  verifySheetOwnershipByEmail,
  checkAndIncrementCrudLimit,
  requireRateLimit,
  validateInput,
  saleCreateSchema,
  errorResponse,
} from '@/lib/security';
import { prisma } from '@/lib/db';
import { readSales, createSale } from '@/lib/google-sheet-inventory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');
    
    const { id } = await params;
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);

    const sales = await readSales(connection.user.id, connection.spreadsheetId);

    return NextResponse.json({ sales });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'api');
    
    const { id } = await params;
    const rawBody = await request.json();
    const body = validateInput(saleCreateSchema, rawBody);
    
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);
    
    const operationsNeeded = 1 + body.items.length;
    await checkAndIncrementCrudLimit(connection.user.id);
    
    // Calculate totals
    const items = body.items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      total: (item.quantity * item.unitPrice) - (item.discount || 0),
    }));

    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const discountPercent = body.discountPercent || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const taxPercent = body.taxPercent || 0;
    const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;
    const total = subtotal - discountAmount + taxAmount;
    const amountPaid = body.amountPaid || 0;
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

    return NextResponse.json({ success: true, sale });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}