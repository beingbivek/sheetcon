// app/admin/settings/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import AdminSettingsClient from './AdminSettingsClient';
import PaymentSettingsForm from '@/components/admin/PaymentSettingsForm';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin-login');

  // Fetch the actual admin record from DB
  const adminUser = session.user as any;
  const admin = await prisma.admin.findUnique({
    where: { email: adminUser.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLogin: true,
      createdAt: true,
    },
  });

  if (!admin) redirect('/admin-login');

  // Fetch system stats
  const [totalUsers, totalSheets, totalTiers, totalTemplates] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.sheetConnection.count({ where: { isActive: true } }),
    prisma.tier.count({ where: { isActive: true } }),
    prisma.template.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <AdminSettingsClient
        admin={{
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          lastLogin: admin.lastLogin ? admin.lastLogin.toISOString() : null,
          createdAt: admin.createdAt.toISOString(),
        }}
        stats={{
          totalUsers,
          totalSheets,
          totalTiers,
          totalTemplates,
        }}
      />
      <PaymentSettingsForm />
    </div>
  );
}