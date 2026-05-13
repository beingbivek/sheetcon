// app/api/user/sheets/[id]/business/returns/[returnId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';
import { approveReturn } from '@/lib/google-sheet-business';
import { z } from 'zod/v4';

const ApproveReturnSchema = z.object({
  refundAmount: z.number().min(0),
  refundMethod: z.string().min(1),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; returnId: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId, returnId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

    const connection = await prisma.sheetConnection.findFirst({
      where: { id: connectionId, userId: user.id, templateId: 'business-management', isActive: true },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const body = ApproveReturnSchema.parse(await request.json());
    const ret = await approveReturn(
      user.id, connection.spreadsheetId, returnId,
      body.refundAmount, body.refundMethod
    );
    return NextResponse.json({ success: true, return: ret });
  });
}