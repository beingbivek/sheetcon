// app/admin/layout.tsx

import { requireAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar */}
      <AdminSidebar session={session} />

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header */}
        <AdminHeader session={session} />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}