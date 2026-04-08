// app/dashboard/billing/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import BillingClient from './BillingClient';

export default async function BillingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      tier: true,
      _count: {
        select: { sheetConnections: true },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  const allTiers = await prisma.tier.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' },
  });

  return (
    <BillingClient
      currentTier={{
        id: user.tier.id,
        name: user.tier.name,
        slug: user.tier.slug,
        price: user.tier.price,
        currency: user.tier.currency,
        maxSheets: user.tier.maxSheets,
        maxCrudPerDay: user.tier.maxCrudPerDay,
        exportToPdf: user.tier.exportToPdf,
        customBranding: user.tier.customBranding,
        prioritySupport: user.tier.prioritySupport,
      }}
      usage={{
        sheetsUsed: user._count.sheetConnections,
        crudToday: user.crudCountToday,
      }}
      allTiers={allTiers.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        price: t.price,
        currency: t.currency,
        maxSheets: t.maxSheets,
        maxCrudPerDay: t.maxCrudPerDay,
        exportToPdf: t.exportToPdf,
        customBranding: t.customBranding,
        prioritySupport: t.prioritySupport,
        description: t.description,
      }))}
    />
  );
}