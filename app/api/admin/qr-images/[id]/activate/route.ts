// app/api/admin/qr-images/[id]/activate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/security/authorization';
import { handleApiError } from '@/lib/security/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    await requireAdmin(['SUPER_ADMIN', 'ADMIN']);

    const { id } = await params;

    // Deactivate all, then activate the selected one — single transaction
    await prisma.$transaction([
      prisma.qrImage.updateMany({
        data: { isActive: false },
      }),
      prisma.qrImage.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  });
}