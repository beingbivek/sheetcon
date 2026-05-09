// app/api/user/sheets/[id]/business/customers/[customerId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import {
  updateCustomer,
  deleteCustomer,
  getSales,
} from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const UpdateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  customerType: z.enum(['WALK_IN', 'ONLINE']).optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, customerId } = await params;
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
    const history = sales
      .filter(s => s.customerId === customerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return NextResponse.json({ success: true, history });
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, customerId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await getConnection(connectionId, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const body = UpdateCustomerSchema.parse(await request.json());
    const customer = await updateCustomer(
      user.id,
      connection.spreadsheetId,
      customerId,
      body
    );

    return NextResponse.json({ success: true, customer });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, customerId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await getConnection(connectionId, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    await deleteCustomer(user.id, connection.spreadsheetId, customerId);
    return NextResponse.json({ success: true });
  });
}