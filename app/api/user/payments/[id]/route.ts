import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, verifyPaymentOwnership } from '@/lib/security/authorization';
import { handleApiError } from '@/lib/security/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return handleApiError(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const payment = await verifyPaymentOwnership(user.id, id);

    return NextResponse.json({ payment });
  });
}