// app/admin/tiers/[id]/edit/page.tsx

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import TierForm from '@/components/admin/TierForm';

export default async function EditTierPage({
  params,
}: {
  params: Promise<{ id: string }>;  // ← Changed to Promise
}) {
  const { id } = await params;  // ← Await params first

  const tier = await prisma.tier.findUnique({
    where: { id },  // ← Use the awaited id
  });

  if (!tier) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Edit Tier</h1>
        <p className="text-slate-400">Update tier details and limits</p>
      </div>

      <TierForm tier={tier} />
    </div>
  );
}