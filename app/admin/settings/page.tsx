// app/admin/settings/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import AdminSettingsClient from './AdminSettingsClient';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).type !== 'admin') {
    redirect('/admin-login');
  }

  // Get admin details
  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email! },
  });

  if (!admin) {
    redirect('/admin-login');
  }

  // Get system stats
  const [totalUsers, totalSheets, totalTiers, totalTemplates] = await Promise.all([
    prisma.user.count(),
    prisma.sheetConnection.count(),
    prisma.tier.count(),
    prisma.template.count(),
  ]);

  return (
    <AdminSettingsClient
      admin={{
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin?.toISOString() || null,
        createdAt: admin.createdAt.toISOString(),
      }}
      stats={{
        totalUsers,
        totalSheets,
        totalTiers,
        totalTemplates,
      }}
    />
  );
}