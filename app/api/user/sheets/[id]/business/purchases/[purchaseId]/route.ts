// app/api/user/sheets/[id]/business/purchases/[purchaseId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import {
  updatePurchaseStatus,
  deletePurchase,
} from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const UpdatePurchaseSchema = z.object({
  status: z.enum(['PAID', 'PARTIAL', 'UNPAID']),
  amountPaid: z.number().min(0),
});

async function getConnection(connectionId: string, userId: string) {
  return prisma.sheetConnection.findFirst({
    where: {
      id: connectionId,
      userId,
      templateId: 'business-management',
      isActive: true,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; purchaseId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, purchaseId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await getConnection(connectionId, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const body = UpdatePurchaseSchema.parse(await request.json());
    const purchase = await updatePurchaseStatus(
      user.id,
      connection.spreadsheetId,
      purchaseId,
      body.status,
      body.amountPaid
    );

    return NextResponse.json({ success: true, purchase });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; purchaseId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, purchaseId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await getConnection(connectionId, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    await deletePurchase(user.id, connection.spreadsheetId, purchaseId);
    return NextResponse.json({ success: true });
  });
}