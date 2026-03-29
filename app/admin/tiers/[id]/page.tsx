// app/admin/tiers/[id]/page.tsx

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DeleteTierButton from '@/components/admin/DeleteTierButton';

export default async function TierDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;  // ← Changed to Promise
}) {
  const { id } = await params;  // ← Await params first

  const tier = await prisma.tier.findUnique({
    where: { id },  // ← Use the awaited id
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { users: true },
      },
    },
  });

  if (!tier) {
    notFound();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{tier.name}</h1>
            {tier.isActive ? (
              <span className="px-3 py-1 bg-green-500/10 text-green-400 text-sm font-medium rounded-full">
                Active
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-500/10 text-red-400 text-sm font-medium rounded-full">
                Inactive
              </span>
            )}
          </div>
          <p className="text-slate-400">{tier.description || 'No description'}</p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/admin/tiers/${tier.id}/edit`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Edit Tier
          </Link>
          <DeleteTierButton tier={tier} userCount={tier._count.users} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Price"
          value={`₹${tier.price}/mo`}
          icon="💰"
          color="blue"
        />
        <StatCard
          label="Active Users"
          value={tier._count.users.toString()}
          icon="👥"
          color="green"
        />
        <StatCard
          label="Max Users"
          value={tier.maxUsers === -1 ? '∞' : tier.maxUsers.toString()}
          icon="📊"
          color="purple"
        />
        <StatCard
          label="Display Order"
          value={tier.displayOrder.toString()}
          icon="🔢"
          color="yellow"
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Limits */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Usage Limits</h2>
          <div className="space-y-3">
            <DetailRow label="Max Sheets" value={tier.maxSheets === -1 ? 'Unlimited' : tier.maxSheets} />
            <DetailRow label="Max Templates" value={tier.maxTemplates === -1 ? 'Unlimited' : tier.maxTemplates} />
            <DetailRow label="Max CRUD/Day" value={tier.maxCrudPerDay === -1 ? 'Unlimited' : tier.maxCrudPerDay.toLocaleString()} />
            <DetailRow label="Currency" value={tier.currency} />
          </div>
        </div>

        {/* Features */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
          <div className="space-y-3">
            <FeatureRow label="Custom Branding" enabled={tier.customBranding} />
            <FeatureRow label="Priority Support" enabled={tier.prioritySupport} />
            <FeatureRow label="PDF Export" enabled={tier.exportToPdf} />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Users on this Tier ({tier._count.users})
          </h2>
          {tier._count.users > 10 && (
            <Link
              href={`/admin/users?tier=${tier.slug}`}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              View All →
            </Link>
          )}
        </div>

        {tier.users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {tier.users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="py-3 px-4">
                      <p className="text-white font-medium">{user.name || 'Anonymous'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{user.email}</td>
                    <td className="py-3 px-4">
                      {user.isActive ? (
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">No users on this tier yet</p>
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
  color: 'blue' | 'green' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
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

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-400">{label}</span>
      {enabled ? (
        <span className="flex items-center text-green-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </span>
      ) : (
        <span className="flex items-center text-red-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </div>
  );
}