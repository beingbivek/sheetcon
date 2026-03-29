// app/admin/page.tsx

import { requireAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
        
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4">
            Welcome, {session.user.name}! 👋
          </h2>
          
          <div className="space-y-2 text-slate-300">
            <p><strong>Email:</strong> {session.user.email}</p>
            <p><strong>Role:</strong> {(session.user as any).role}</p>
            <p><strong>Status:</strong> <span className="text-green-400">Active</span></p>
          </div>

          <div className="mt-6">
            <a
              href="/api/auth/signout"
              className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Sign Out
            </a>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-blue-400">0</p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-2">Total Tiers</h3>
            <p className="text-3xl font-bold text-green-400">3</p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-2">Revenue (MRR)</h3>
            <p className="text-3xl font-bold text-purple-400">₹0</p>
          </div>
        </div>
      </div>
    </div>
  );
}