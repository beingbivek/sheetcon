// app/api/admin/qr-images/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/security/authorization';
import { handleApiError, Errors } from '@/lib/security/errors';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    await requireAdmin(['SUPER_ADMIN', 'ADMIN']);

    const { id } = await params;

    const image = await prisma.qrImage.findUnique({ where: { id } });
    if (!image) throw Errors.notFound('QR image');

    await prisma.qrImage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  });
}