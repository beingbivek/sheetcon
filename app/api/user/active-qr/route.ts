// app/api/user/active-qr/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/security/errors';

export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    const activeQr = await prisma.qrImage.findFirst({
      where: { isActive: true },
      select: { imageUrl: true, label: true },
    });

    return NextResponse.json({ qr: activeQr });
  });
}