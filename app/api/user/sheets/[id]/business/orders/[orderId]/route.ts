// app/api/user/sheets/[id]/business/orders/[orderId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import { updateOrderStatus, deleteOrder } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const UpdateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED']),
  amountPaid: z.number().min(0).optional(),
  paymentMethod: z.string().optional().nullable(),
  delivery: z.object({
    agentType: z.enum(['STAFF', 'COURIER']),
    agentName: z.string().min(1),
    agentPhone: z.string().optional().nullable(),
    courierName: z.string().optional().nullable(),
    trackingCode: z.string().optional().nullable(),
    deliveryFee: z.number().min(0).default(0),
    notes: z.string().optional().nullable(),
  }).optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, orderId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await prisma.sheetConnection.findFirst({
      where: { id: connectionId, userId: user.id, templateId: 'business-management', isActive: true },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const body = UpdateOrderSchema.parse(await request.json());
    const order = await updateOrderStatus(
      user.id, connection.spreadsheetId, orderId, body.status,
      { delivery: body.delivery ?? undefined, amountPaid: body.amountPaid, paymentMethod: body.paymentMethod ?? undefined }
    );
    return NextResponse.json({ success: true, order });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, orderId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await prisma.sheetConnection.findFirst({
      where: { id: connectionId, userId: user.id, templateId: 'business-management', isActive: true },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await deleteOrder(user.id, connection.spreadsheetId, orderId);
    return NextResponse.json({ success: true });
  });
}