// app/api/user/payments/[id]/submit-proof/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, verifyPaymentOwnership } from '@/lib/security/authorization';
import { handleApiError, Errors } from '@/lib/security/errors';
import { requireRateLimit } from '@/lib/security/rate-limit';
import { submitPaymentProofSchema } from '@/lib/validation/payment-schemas';
import { uploadPaymentProof } from '@/lib/cloudinary';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  return handleApiError(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Rate limit — 3 uploads per minute
    await requireRateLimit(request, user.id, 'strict');

    // Verify ownership
    const payment = await verifyPaymentOwnership(user.id, id);

    // Check status
    if (payment.status !== 'AWAITING_PAYMENT') {
      throw Errors.invalidInput(
        'Payment proof already submitted or this request is no longer active.'
      );
    }

    // Check expiry
    if (payment.expiresAt < new Date()) {
      await prisma.paymentRequest.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      throw Errors.invalidInput('This payment request has expired. Please create a new one.');
    }

    // Parse and validate input
    const body = await request.json();
    const {
      screenshotBase64,
      transactionReference,
      payerAccount,
      userNote,
    } = submitPaymentProofSchema.parse(body);

    // Validate image type from base64 prefix
    if (!screenshotBase64.startsWith('data:image/')) {
      throw Errors.invalidInput('Screenshot must be a JPG or PNG image.');
    }

    // Upload screenshot to Cloudinary
    const screenshotUrl = await uploadPaymentProof(
      screenshotBase64,
      payment.invoiceId
    );

    // Update payment request
    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        screenshotUrl,
        transactionReference,
        payerAccount,
        userNote: userNote || null,
        submittedAt: new Date(),
        status: 'UNDER_REVIEW',
      },
      include: {
        requestedTier: true,
      },
    });

    return NextResponse.json({
      success: true,
      payment: updated,
    });
  });
}