// app/dashboard/layout.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UserSidebar from '@/components/user/UserSidebar';
import UserHeader from '@/components/user/UserHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).type === 'admin') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <UserSidebar session={session} />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <UserHeader session={session} />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}