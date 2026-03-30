// app/admin/page.tsx

import { prisma } from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function AdminDashboardPage() {
  // Get this month's start
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  // Fetch all stats
  const [
    userCount,
    tierCount,
    adminCount,
    newUsersThisMonth,
    recentUsers,
    tierDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tier.count({ where: { isActive: true } }),
    prisma.admin.count(),
    prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { tier: { select: { name: true } } },
    }),
    prisma.tier.findMany({
      where: { isActive: true },
      select: {
        name: true,
        price: true,
        _count: { select: { users: true } },
      },
    }),
  ]);

  // Calculate MRR
  const mrr = tierDistribution.reduce((sum, tier) => {
    return sum + (tier.price * tier._count.users);
  }, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={userCount.toString()}
          subtitle={`+${newUsersThisMonth} this month`}
          icon="👥"
          color="blue"
          href="/admin/users"
        />
        <StatCard
          title="Active Tiers"
          value={tierCount.toString()}
          subtitle="Subscription plans"
          icon="🏷️"
          color="green"
          href="/admin/tiers"
        />
        <StatCard
          title="Revenue (MRR)"
          value={`₹${mrr.toLocaleString()}`}
          subtitle="Monthly recurring"
          icon="💰"
          color="purple"
          href="/admin/analytics"
        />
        <StatCard
          title="Admins"
          value={adminCount.toString()}
          subtitle="Platform managers"
          icon="👨‍💼"
          color="yellow"
          href="/admin/settings"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Users</h2>
            <Link
              href="/admin/users"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name || 'Anonymous'}</p>
                    <p className="text-slate-400 text-sm">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                    {user.tier.name}
                  </span>
                  <p className="text-slate-400 text-xs mt-1">
                    {format(new Date(user.createdAt), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="text-center text-slate-400 py-4">No users yet</p>
            )}
          </div>
        </div>

        {/* Tier Overview */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Tier Overview</h2>
            <Link
              href="/admin/tiers"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Manage →
            </Link>
          </div>
          <div className="space-y-3">
            {tierDistribution.map((tier) => (
              <div
                key={tier.name}
                className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{tier.name}</p>
                  <p className="text-slate-400 text-sm">₹{tier.price}/month</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{tier._count.users}</p>
                  <p className="text-slate-400 text-sm">users</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/tiers/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Create Tier
          </Link>
          <Link
            href="/admin/analytics"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            📊 View Analytics
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            👥 Manage Users
          </Link>
          <Link
            href="/admin/templates"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            📋 Templates
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  href: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  return (
    <Link href={href} className="block">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-blue-500 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <span className="text-2xl">{icon}</span>
        </div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        <div className={`h-1 bg-gradient-to-r ${colorClasses[color]} rounded-full mt-4`} />
      </div>
    </Link>
  );
}