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

  return <PaymentsClient payments={payments} />;
}