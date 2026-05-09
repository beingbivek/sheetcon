// app/api/user/sheets/[id]/business/suppliers/[supplierId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import { updateSupplier, deleteSupplier } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const UpdateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, supplierId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await getConnection(connectionId, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const body = UpdateSupplierSchema.parse(await request.json());
    const supplier = await updateSupplier(
      user.id,
      connection.spreadsheetId,
      supplierId,
      body
    );

    return NextResponse.json({ success: true, supplier });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, supplierId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await getConnection(connectionId, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    await deleteSupplier(user.id, connection.spreadsheetId, supplierId);
    return NextResponse.json({ success: true });
  });
}