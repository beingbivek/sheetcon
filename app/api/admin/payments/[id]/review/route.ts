// app/api/admin/payments/[id]/review/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/security/authorization';
import { handleApiError, Errors } from '@/lib/security/errors';
import { reviewPaymentSchema } from '@/lib/validation/payment-schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  return handleApiError(async () => {
    const admin = await requireAdmin(['SUPER_ADMIN', 'ADMIN']);
    const { id } = await params;

    const body = await request.json();
    const { action, adminNote, rejectionReason } = reviewPaymentSchema.parse(body);

    // Load payment with user
    const payment = await prisma.paymentRequest.findUnique({
      where: { id },
      include: { user: true, requestedTier: true },
    });

    if (!payment) throw Errors.notFound('Payment request');

    if (!['UNDER_REVIEW', 'AWAITING_PAYMENT'].includes(payment.status)) {
      throw Errors.invalidInput(
        `Cannot review a payment with status ${payment.status}.`
      );
    }

    if (action === 'approve') {
      // Calculate subscription expiry
      const now = new Date();
      let expiresAt: Date;

      switch (payment.requestedBillingCycle) {
        case 'ANNUAL':
          expiresAt = new Date(now);
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          break;
        case 'LIFETIME':
          expiresAt = new Date(now);
          expiresAt.setFullYear(expiresAt.getFullYear() + 100);
          break;
        case 'MONTHLY':
        default:
          expiresAt = new Date(now);
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          break;
      }

      // Atomic transaction — update payment + upgrade user tier
      await prisma.$transaction([
        prisma.paymentRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            adminNote: adminNote || null,
            approvedByAdminId: admin.id,
            approvedAt: now,
          },
        }),
        prisma.user.update({
          where: { id: payment.userId },
          data: {
            tierId: payment.requestedTierId,
            subscriptionStatus: 'ACTIVE',
            subscriptionExpiresAt: expiresAt,
          },
        }),
        // Increment new tier user count
        prisma.tier.update({
          where: { id: payment.requestedTierId },
          data: { currentUserCount: { increment: 1 } },
        }),
        // Decrement old tier user count if different
        ...(payment.user.tierId !== payment.requestedTierId
          ? [
              prisma.tier.update({
                where: { id: payment.user.tierId },
                data: { currentUserCount: { decrement: 1 } },
              }),
            ]
          : []),
      ]);

      return NextResponse.json({ success: true, action: 'approved' });
    }

    if (action === 'reject') {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw Errors.invalidInput('Rejection reason is required.');
      }

      await prisma.paymentRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNote: adminNote || null,
          rejectionReason: rejectionReason.trim(),
          rejectedByAdminId: admin.id,
          rejectedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    throw Errors.invalidInput('Invalid action.');
  });
}