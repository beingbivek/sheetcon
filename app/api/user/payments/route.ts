import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/security/authorization';
import { handleApiError } from '@/lib/security/errors';

export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    const user = await requireAuth();

    const payments = await prisma.paymentRequest.findMany({
      where: { userId: user.id },
      include: {
        requestedTier: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payments });
  });
}