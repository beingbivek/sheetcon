// app/api/user/payments/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, hasActivePendingPayment } from '@/lib/security/authorization';
import { handleApiError, Errors } from '@/lib/security/errors';
import { requireRateLimit } from '@/lib/security/rate-limit';
import { createPaymentRequestSchema } from '@/lib/validation/payment-schemas';
import { generateInvoiceId } from '@/lib/utils/invoice';

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    // Auth check
    const user = await requireAuth();

    // Rate limit — 5 requests per minute per user (maps to 'strict' tier)
    await requireRateLimit(request, user.id, 'strict');

    // Parse and validate input
    const body = await request.json();
    const { tierId, billingCycle } = createPaymentRequestSchema.parse(body);

    // Check for active pending payment
    const hasPending = await hasActivePendingPayment(user.id);
    if (hasPending) {
      throw Errors.invalidInput(
        'You already have a pending payment request. Please complete or cancel it first.'
      );
    }

    // Get requested tier
    const tier = await prisma.tier.findUnique({
      where: { id: tierId, isActive: true },
    });

    if (!tier) {
      throw Errors.notFound('Tier');
    }

    // Cannot "upgrade" to free tier via payment
    if (tier.price === 0) {
      throw Errors.invalidInput('Cannot create payment request for free tier.');
    }

    // Calculate amount based on billing cycle
    const amount =
      billingCycle === 'ANNUAL' && tier.annualPrice
        ? tier.annualPrice
        : tier.price;

    // Generate unique invoice ID
    const invoiceId = generateInvoiceId();

    // Set expiry (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create payment request
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        invoiceId,
        userId: user.id,
        requestedTierId: tierId,
        requestedBillingCycle: billingCycle,
        requestedTierName: tier.name,
        amountSnapshot: amount,
        currency: tier.currency,
        paymentMethod: 'ESEWA_QR',
        status: 'AWAITING_PAYMENT',
        expiresAt,
      },
      include: {
        requestedTier: true,
      },
    });

    return NextResponse.json({
      success: true,
      payment: paymentRequest,
    });
  });
}