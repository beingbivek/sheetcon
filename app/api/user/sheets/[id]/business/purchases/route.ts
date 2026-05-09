// app/api/user/sheets/[id]/business/purchases/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { requireAuth } from '@/lib/security';
import { requireRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getPurchases, createPurchase } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const PurchaseItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const CreatePurchaseSchema = z.object({
  date: z.string().min(1),
  supplierId: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  subtotal: z.number().min(0),
  taxPercent: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  transportCost: z.number().min(0).default(0),
  customsCost: z.number().min(0).default(0),
  storageCost: z.number().min(0).default(0),
  otherExpenses: z.number().min(0).default(0),
  landedCost: z.number().min(0),
  total: z.number().min(0),
  amountPaid: z.number().min(0).default(0),
  amountDue: z.number().min(0).default(0),
  status: z.enum(['PAID', 'PARTIAL', 'UNPAID']).default('PAID'),
  imageUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(PurchaseItemSchema).min(1, 'At least one item required'),
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

    const purchases = await getPurchases(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, purchases });
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

    const body = CreatePurchaseSchema.parse(await request.json());
    const purchase = await createPurchase(
      user.id,
      connection.spreadsheetId,
      body
    );

    return NextResponse.json({ success: true, purchase }, { status: 201 });
  });
}