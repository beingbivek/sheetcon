// app/api/user/sheets/[id]/business/suppliers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import { getSuppliers, createSupplier } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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

    const suppliers = await getSuppliers(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, suppliers });
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

    const body = CreateSupplierSchema.parse(await request.json());
    const supplier = await createSupplier(user.id, connection.spreadsheetId, {
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      contactPerson: body.contactPerson ?? null,
      paymentTerms: body.paymentTerms ?? null,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ success: true, supplier }, { status: 201 });
  });
}