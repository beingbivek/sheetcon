// app/admin/users/[id]/page.tsx

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import BanUserButton from '@/components/admin/BanUserButton';
import ChangeTierButton from '@/components/admin/ChangeTierButton';

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
        take: 5,
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
          <h1 className="text-3xl font-bold text-white mb-2">
            {user.name || 'Anonymous User'}
          </h1>
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
          value={user.isActive ? 'Active' : 'Inactive'}
          icon="🔍"
          color={user.isActive ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Info */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">User Information</h2>
          <div className="space-y-4">
            <InfoRow label="User ID" value={user.id} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Name" value={user.name || 'Not provided'} />
            <InfoRow label="Email Verified" value={user.emailVerified ? 'Yes' : 'No'} />
            <InfoRow label="Joined Date" value={format(new Date(user.createdAt), 'PPP')} />
            <InfoRow label="Last Login" value={user.lastLoginAt ? format(new Date(user.lastLoginAt), 'PPP') : 'Never'} />
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
            <InfoRow label="Tier Price" value={`₹${user.tier.price}/month`} />
            <InfoRow label="Max Sheets" value={user.tier.maxSheets === -1 ? 'Unlimited' : user.tier.maxSheets.toString()} />
            <InfoRow label="Max Templates" value={user.tier.maxTemplates === -1 ? 'Unlimited' : user.tier.maxTemplates.toString()} />
            <InfoRow label="CRUD/Day Limit" value={user.tier.maxCrudPerDay === -1 ? 'Unlimited' : user.tier.maxCrudPerDay.toLocaleString()} />
          </div>
        </div>
      </div>

      {/* Connected Sheets */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Connected Sheets</h2>
          <span className="text-slate-400">
            {user._count.sheetConnections} total
          </span>
        </div>

        {user.sheetConnections.length > 0 ? (
          <div className="space-y-3">
            {user.sheetConnections.map((sheet) => (
              <div
                key={sheet.id}
                className="flex items-center justify-between p-4 bg-slate-900 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{sheet.spreadsheetName}</p>
                  <p className="text-sm text-slate-400">{sheet.sheetType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">
                    Connected {format(new Date(sheet.createdAt), 'MMM d, yyyy')}
                  </p>
                  <p className={`text-xs ${sheet.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {sheet.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">No sheets connected yet</p>
          </div>
        )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}