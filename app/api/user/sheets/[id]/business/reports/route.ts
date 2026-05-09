// app/api/user/sheets/[id]/business/reports/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { requireAuth } from '@/lib/security';
import { requireRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getBusinessReport } from '@/lib/google-sheet-business';

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

    const report = await getBusinessReport(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, report });
  });
}