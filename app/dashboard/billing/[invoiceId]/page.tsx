// app/dashboard/billing/[invoiceId]/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import InvoiceClient from './InvoiceClient';

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

export default async function InvoicePage({ params }: RouteParams) {
  const { invoiceId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const payment = await prisma.paymentRequest.findFirst({
    where: { invoiceId, user: { email: session.user.email! } },
    include: {
      user: true,
      requestedTier: true,
    },
  });

  if (!payment) redirect('/dashboard/billing');

  // Load active QR image
  const activeQr = await prisma.qrImage.findFirst({
    where: { isActive: true },
    select: { imageUrl: true, label: true },
  });

  // Load payment settings (account details + instructions)
  const settings = await prisma.paymentSettings.findFirst({
    where: { isActive: true },
  });

  return (
    <InvoiceClient
      payment={payment}
      settings={settings}
      activeQr={activeQr}
    />
  );
}