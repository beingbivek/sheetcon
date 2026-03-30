// app/dashboard/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  const user = await prisma.user.findUnique({
    where: { email: session?.user?.email! },
    include: {
      tier: true,
      sheetConnections: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    return <div>User not found</div>;
  }

  const sheetsConnected = user.sheetConnections.length;
  const sheetsLimit = user.tier.maxSheets;
  const canConnectMore = sheetsLimit === -1 || sheetsConnected < sheetsLimit;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome, {user.name || 'there'}! 👋
        </h1>
        <p className="text-slate-600">
          Here's an overview of your SheetCon workspace
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-600">Current Plan</p>
            <span className="text-2xl">🏷️</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{user.tier.name}</p>
          <Link href="/dashboard/billing" className="text-blue-600 text-sm hover:underline">
            Upgrade →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-600">Sheets Connected</p>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {sheetsConnected} / {sheetsLimit === -1 ? '∞' : sheetsLimit}
          </p>
          {canConnectMore && (
            <Link href="/dashboard/connect" className="text-blue-600 text-sm hover:underline">
              Connect Sheet →
            </Link>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-600">Daily Usage</p>
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {user.crudCountToday} / {user.tier.maxCrudPerDay === -1 ? '∞' : user.tier.maxCrudPerDay}
          </p>
          <p className="text-slate-500 text-sm">Operations today</p>
        </div>
      </div>

      {/* Connected Sheets */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Your Sheets</h2>
          {canConnectMore && (
            <Link
              href="/dashboard/connect"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              + Connect Sheet
            </Link>
          )}
        </div>

        {user.sheetConnections.length > 0 ? (
          <div className="space-y-4">
            {user.sheetConnections.map((sheet) => (
              <div
                key={sheet.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{sheet.spreadsheetName}</p>
                    <p className="text-sm text-slate-500">{sheet.templateId || 'No template'}</p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/sheets/${sheet.id}`}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm transition-colors"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📋</span>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No sheets connected</h3>
            <p className="text-slate-600 mb-6">
              Connect your first Google Sheet to get started
            </p>
            <Link
              href="/dashboard/connect"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Connect Your First Sheet
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/connect"
            className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl mb-2 block">🔗</span>
            <p className="font-medium text-slate-900">Connect Sheet</p>
            <p className="text-sm text-slate-500">Link a new Google Sheet</p>
          </Link>
          <Link
            href="/dashboard/templates"
            className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl mb-2 block">📋</span>
            <p className="font-medium text-slate-900">Browse Templates</p>
            <p className="text-sm text-slate-500">Explore app templates</p>
          </Link>
          <Link
            href="/dashboard/billing"
            className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl mb-2 block">💳</span>
            <p className="font-medium text-slate-900">Upgrade Plan</p>
            <p className="text-sm text-slate-500">Get more features</p>
          </Link>
        </div>
      </div>
    </div>
  );
}