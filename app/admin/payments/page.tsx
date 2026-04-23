// app/admin/payments/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import PaymentsClient from './PaymentsClient';

export default async function AdminPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin-login');

  const payments = await prisma.paymentRequest.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, name: true } },
      requestedTier: { select: { name: true } },
      approvedBy: { select: { name: true } },
      rejectedBy: { select: { name: true } },
    },
  });

  // Serialize all Date fields to ISO strings before passing to client component.
  // Next.js cannot serialize Date objects across the server→client boundary.
  const serialized = payments.map((p) => ({
    ...p,
    createdAt:   p.createdAt.toISOString(),
    updatedAt:   p.updatedAt.toISOString(),
    expiresAt:   p.expiresAt.toISOString(),
    submittedAt: p.submittedAt  ? p.submittedAt.toISOString()  : null,
    approvedAt:  p.approvedAt   ? p.approvedAt.toISOString()   : null,
    rejectedAt:  p.rejectedAt   ? p.rejectedAt.toISOString()   : null,
  }));

  return <PaymentsClient payments={serialized} />;
}