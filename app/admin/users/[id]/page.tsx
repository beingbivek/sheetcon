// app/admin/users/[id]/page.tsx

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import BanUserButton from '@/components/admin/BanUserButton';
import ChangeTierButton from '@/components/admin/ChangeTierButton';
import DeleteSheetConnectionButton from '@/components/admin/DeleteSheetConnectionButton';

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tier: true,
      sheetConnections: {
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          sheetConnections: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin/users"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-white">
              {user.name || 'Anonymous User'}
            </h1>
            {user.isBanned && (
              <span className="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                BANNED
              </span>
            )}
          </div>
          <p className="text-slate-400">{user.email}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/users/${user.id}/edit`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Edit User
          </Link>
          <BanUserButton user={user} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Current Tier"
          value={user.tier.name}
          icon="🏷️"
          color="blue"
        />
        <StatCard
          label="Sheets Connected"
          value={user._count.sheetConnections.toString()}
          icon="📊"
          color="green"
        />
        <StatCard
          label="CRUD Today"
          value={`${user.crudCountToday} / ${user.tier.maxCrudPerDay === -1 ? '∞' : user.tier.maxCrudPerDay}`}
          icon="⚡"
          color="purple"
        />
        <StatCard
          label="Status"
          value={user.isBanned ? 'Banned' : user.isActive ? 'Active' : 'Inactive'}
          icon={user.isBanned ? '🚫' : '🔍'}
          color={user.isBanned ? 'red' : user.isActive ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Info */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">User Information</h2>
          <div className="space-y-4">
            <InfoRow label="User ID" value={user.id} mono />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Name" value={user.name || 'Not provided'} />
            <InfoRow label="Email Verified" value={user.emailVerified ? 'Yes' : 'No'} />
            <InfoRow label="Joined Date" value={format(new Date(user.createdAt), 'PPP')} />
            <InfoRow label="Last Login" value={user.lastLoginAt ? format(new Date(user.lastLoginAt), 'PPP p') : 'Never'} />
            {user.isBanned && user.banReason && (
              <InfoRow label="Ban Reason" value={user.banReason} highlight="red" />
            )}
          </div>
        </div>

        {/* Tier Information */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Tier Information</h2>
            <ChangeTierButton user={user} currentTier={user.tier} />
          </div>
          <div className="space-y-4">
            <InfoRow label="Current Tier" value={user.tier.name} />
            <InfoRow label="Tier Price" value={`NPR ${user.tier.price}/month`} />
            <InfoRow label="Max Sheets" value={user.tier.maxSheets === -1 ? 'Unlimited' : user.tier.maxSheets.toString()} />
            <InfoRow label="Max Templates" value={user.tier.maxTemplates === -1 ? 'Unlimited' : user.tier.maxTemplates.toString()} />
            <InfoRow label="CRUD/Day Limit" value={user.tier.maxCrudPerDay === -1 ? 'Unlimited' : user.tier.maxCrudPerDay.toLocaleString()} />
            <InfoRow label="PDF Export" value={user.tier.exportToPdf ? 'Yes' : 'No'} />
            <InfoRow label="Priority Support" value={user.tier.prioritySupport ? 'Yes' : 'No'} />
          </div>
        </div>
      </div>

      {/* Connected Sheets */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Connected Sheets</h2>
            <p className="text-sm text-slate-400 mt-1">
              {user._count.sheetConnections} sheet{user._count.sheetConnections !== 1 ? 's' : ''} connected
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Inactive
            </span>
          </div>
        </div>

        {user.sheetConnections.length > 0 ? (
          <div className="space-y-3">
            {user.sheetConnections.map((sheet) => (
              <div
                key={sheet.id}
                className="flex items-center justify-between p-4 bg-slate-900 rounded-lg hover:bg-slate-900/80 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {/* Template Icon */}
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center text-xl
                    ${sheet.templateId === 'finance' ? 'bg-green-500/20' :
                      sheet.templateId === 'inventory' ? 'bg-blue-500/20' : 'bg-slate-700'}
                  `}>
                    {sheet.templateId === 'finance' ? '💰' :
                      sheet.templateId === 'inventory' ? '📦' : '📊'}
                  </div>

                  {/* Sheet Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{sheet.spreadsheetName}</p>
                      <span className={`w-2 h-2 rounded-full ${sheet.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="capitalize">{sheet.templateId || 'No template'}</span>
                      <span>•</span>
                      <span>{sheet.sheetType}</span>
                      <span>•</span>
                      <span>Connected {format(new Date(sheet.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* View in Google Sheets */}
                  {sheet.spreadsheetUrl && (
                    <a
                      href={sheet.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Open in Google Sheets"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}

                  {/* Delete Button */}
                  <DeleteSheetConnectionButton
                    userId={user.id}
                    sheet={{
                      id: sheet.id,
                      spreadsheetName: sheet.spreadsheetName,
                      spreadsheetId: sheet.spreadsheetId,
                      templateId: sheet.templateId,
                      sheetType: sheet.sheetType,
                      isActive: sheet.isActive,
                      createdAt: sheet.createdAt,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-slate-400 mb-2">No sheets connected yet</p>
            <p className="text-sm text-slate-500">
              This user hasn't connected any Google Sheets to their account.
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/users/${user.id}/reset-crud`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
          >
            🔄 Reset CRUD Count
          </Link>
          <Link
            href={`mailto:${user.email}`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
          >
            📧 Send Email
          </Link>
          <Link
            href={`/admin/users/${user.id}/edit`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
          >
            ✏️ Edit Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <div className={`h-1 bg-gradient-to-r ${colorClasses[color]} rounded-full mt-3`} />
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: 'red' | 'green' | 'yellow';
}) {
  const highlightClasses = {
    red: 'text-red-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={`
        font-medium 
        ${highlight ? highlightClasses[highlight] : 'text-white'}
        ${mono ? 'font-mono text-sm' : ''}
      `}>
        {value}
      </span>
    </div>
  );
}