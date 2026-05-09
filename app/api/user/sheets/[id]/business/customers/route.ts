// app/api/user/sheets/[id]/business/customers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import { getCustomers, createCustomer } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  customerType: z.enum(['WALK_IN', 'ONLINE']).default('WALK_IN'),
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

    const customers = await getCustomers(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, customers });
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

    const body = CreateCustomerSchema.parse(await request.json());
    const customer = await createCustomer(user.id, connection.spreadsheetId, {
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      customerType: body.customerType,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  });
}