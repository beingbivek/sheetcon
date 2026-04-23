import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/security/authorization';
import { handleApiError, Errors } from '@/lib/security/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return handleApiError(async () => {
    await requireAdmin();
    const { id } = await params;

    const payment = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            tier: true,
          },
        },
        requestedTier: true,
        approvedBy: true,
        rejectedBy: true,
      },
    });

    if (!payment) {
      throw Errors.notFound('Payment request');
    }

    return NextResponse.json({ payment });
  });
}