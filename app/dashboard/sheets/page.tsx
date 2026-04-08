// app/dashboard/sheets/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function MySheetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      tier: true,
      sheetConnections: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  const sheetsUsed = user.sheetConnections.length;
  const sheetsLimit = user.tier.maxSheets;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Sheets</h1>
          <p className="text-slate-600 mt-1">
            {sheetsUsed} of {sheetsLimit === -1 ? 'Unlimited' : sheetsLimit} sheets used
          </p>
        </div>
        {(sheetsLimit === -1 || sheetsUsed < sheetsLimit) && (
          <Link
            href="/dashboard/connect"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <span>🔗</span> Connect New Sheet
          </Link>
        )}
      </div>

      {user.sheetConnections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.sheetConnections.map((connection) => (
            <Link
              key={connection.id}
              href={`/dashboard/sheets/${connection.id}`}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">
                  {connection.templateId === 'finance' ? '💰' : '📦'}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  connection.syncStatus === 'ACTIVE' || connection.syncStatus === 'SYNCED'
                    ? 'bg-green-100 text-green-700'
                    : connection.syncStatus === 'ERROR'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {connection.syncStatus}
                </span>
              </div>
              
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {connection.spreadsheetName}
              </h3>
              
              <p className="text-sm text-slate-500 mt-1">
                {connection.templateId === 'finance' 
                  ? 'Personal Finance Tracker' 
                  : 'Inventory Manager'}
              </p>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {connection.lastSyncedAt 
                    ? `Last sync: ${new Date(connection.lastSyncedAt).toLocaleDateString()}`
                    : 'Not synced yet'}
                </span>
                <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <span className="text-6xl mb-4 block">📊</span>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No sheets connected yet</h3>
          <p className="text-slate-600 mb-6">
            Connect your first Google Sheet to start managing your data with beautiful dashboards.
          </p>
          <Link
            href="/dashboard/connect"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <span>🔗</span> Connect Your First Sheet
          </Link>
        </div>
      )}

      {/* Usage Info */}
      {sheetsLimit !== -1 && sheetsUsed >= sheetsLimit && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-900">Sheet limit reached</h3>
              <p className="text-yellow-800 mt-1">
                You've used all {sheetsLimit} sheets available on your {user.tier.name} plan.
                Upgrade to connect more sheets.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-block mt-3 text-yellow-900 font-medium hover:underline"
              >
                View upgrade options →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}