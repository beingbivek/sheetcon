// app/api/user/sheets/[id]/business/returns/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import { getReturns, createReturn } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const ReturnItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  condition: z.enum(['DAMAGED', 'GOOD', 'DEFECTIVE']).default('DAMAGED'),
});

const CreateReturnSchema = z.object({
  returnType: z.enum(['CUSTOMER_RETURN', 'SUPPLIER_RETURN']),
  date: z.string().min(1),
  saleId: z.string().optional().nullable(),
  saleInvoice: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  purchaseId: z.string().optional().nullable(),
  purchaseInvoice: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  totalValue: z.number().min(0),
  refundAmount: z.number().min(0).default(0),
  refundMethod: z.string().optional().nullable(),
  items: z.array(ReturnItemSchema).min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');

    const connection = await prisma.sheetConnection.findFirst({
      where: { id: connectionId, userId: user.id, templateId: 'business-management', isActive: true },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const returns = await getReturns(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, returns });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await prisma.sheetConnection.findFirst({
      where: { id: connectionId, userId: user.id, templateId: 'business-management', isActive: true },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const body = CreateReturnSchema.parse(await request.json());
    const ret = await createReturn(user.id, connection.spreadsheetId, {
      ...body, status: 'PENDING',
    });
    return NextResponse.json({ success: true, return: ret }, { status: 201 });
  });
}