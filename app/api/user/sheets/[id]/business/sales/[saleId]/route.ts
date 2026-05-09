// app/api/user/sheets/[id]/business/sales/[saleId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { requireAuth } from '@/lib/security';
import { requireRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getSales, deleteSale } from '@/lib/google-sheet-business';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; saleId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, saleId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');

    const connection = await getConnection(connectionId, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const sales = await getSales(user.id, connection.spreadsheetId);
    const sale = sales.find(s => s.id === saleId);
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, sale });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; saleId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, saleId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await getConnection(connectionId, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    await deleteSale(user.id, connection.spreadsheetId, saleId);
    return NextResponse.json({ success: true });
  });
}