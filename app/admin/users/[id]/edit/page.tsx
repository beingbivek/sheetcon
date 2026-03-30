// app/admin/users/[id]/edit/page.tsx

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import UserForm from '@/components/admin/UserForm';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tier: true,
    },
  });

  if (!user) {
    notFound();
  }

  const tiers = await prisma.tier.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Edit User</h1>
        <p className="text-slate-400">Update user information and settings</p>
      </div>

      <UserForm user={user} tiers={tiers} />
    </div>
  );
}