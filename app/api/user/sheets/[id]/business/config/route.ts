// app/api/user/sheets/[id]/business/config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import { getConfig, updateConfig } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const ConfigSchema = z.object({
  businessName: z.string().optional(),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  taxNumber: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  paymentQrUrl: z.string().optional(),
  invoicePrefix: z.string().optional(),
  invoiceFooter: z.string().optional(),
  lowStockThreshold: z.string().optional(),
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

    const config = await getConfig(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, config });
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

    const body = ConfigSchema.parse(await request.json());

    const stringified: Record<string, string> = {};
    Object.entries(body).forEach(([k, v]) => {
      if (v !== undefined) stringified[k] = v;
    });

    const config = await updateConfig(
      user.id,
      connection.spreadsheetId,
      stringified
    );

    return NextResponse.json({ success: true, config });
  });
}