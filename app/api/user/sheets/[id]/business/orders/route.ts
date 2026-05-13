// app/api/user/sheets/[id]/business/orders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import { getOrders, createOrder } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const OrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  variation: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const DeliverySchema = z.object({
  agentType: z.enum(['STAFF', 'COURIER']),
  agentName: z.string().min(1),
  agentPhone: z.string().optional().nullable(),
  courierName: z.string().optional().nullable(),
  trackingCode: z.string().optional().nullable(),
  deliveryFee: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const CreateOrderSchema = z.object({
  date: z.string().min(1),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  total: z.number().min(0),
  amountPaid: z.number().min(0).default(0),
  amountDue: z.number().min(0).default(0),
  paymentMethod: z.string().optional().nullable(),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID']).default('UNPAID'),
  notes: z.string().optional().nullable(),
  items: z.array(OrderItemSchema).min(1),
  delivery: DeliverySchema.optional().nullable(),
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

    const orders = await getOrders(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, orders });
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

    const body = CreateOrderSchema.parse(await request.json());
    const order = await createOrder(user.id, connection.spreadsheetId, {
      ...body,
      status: 'PENDING',
      confirmedAt: null, packedAt: null, dispatchedAt: null,
      deliveredAt: null, cancelledAt: null, returnedAt: null,
    });
    return NextResponse.json({ success: true, order }, { status: 201 });
  });
}