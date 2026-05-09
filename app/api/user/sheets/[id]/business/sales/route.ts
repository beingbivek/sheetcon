// app/api/user/sheets/[id]/business/sales/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { requireAuth } from '@/lib/security';
import { requireRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getSales, createSale } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const SaleItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  variation: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const CreateSaleSchema = z.object({
  date: z.string().min(1),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  subtotal: z.number().min(0),
  discountType: z.enum(['PERCENT', 'FIXED']).optional().nullable(),
  discountValue: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  taxPercent: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  total: z.number().min(0),
  amountPaid: z.number().min(0),
  amountDue: z.number().min(0).default(0),
  paymentMethod: z.string().optional().nullable(),
  status: z.enum(['PAID', 'PARTIAL', 'UNPAID']).default('PAID'),
  notes: z.string().optional().nullable(),
  items: z.array(SaleItemSchema).min(1, 'At least one item required'),
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
      where: {
        id: connectionId,
        userId: user.id,
        templateId: 'business-management',
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const sales = await getSales(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, sales });
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
      where: {
        id: connectionId,
        userId: user.id,
        templateId: 'business-management',
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const body = CreateSaleSchema.parse(await request.json());
    const sale = await createSale(user.id, connection.spreadsheetId, body);

    return NextResponse.json({ success: true, sale }, { status: 201 });
  });
}