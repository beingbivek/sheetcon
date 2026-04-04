// app/dashboard/settings/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import UserSettingsClient from './UserSettingsClient';

export default async function UserSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { tier: true },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <UserSettingsClient
      user={{
        id: user.id,
        name: user.name || '',
        email: user.email,
        image: user.image,
        tierName: user.tier.name,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
      }}
    />
  );
}