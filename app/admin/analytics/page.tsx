// app/admin/analytics/page.tsx

import { prisma } from '@/lib/db';
import { format, subDays } from 'date-fns';
import UserGrowthChart from '@/components/admin/charts/UserGrowthChart';
import TierDistributionChart from '@/components/admin/charts/TierDistributionChart';
import UsageChart from '@/components/admin/charts/UsageChart';

export default async function AnalyticsPage() {
  const today = new Date();
  const last30Days = subDays(today, 30);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    totalTiers,
    tierDistribution,
    recentUsers,
    usersLast30Days,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true, isBanned: false } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.tier.count({ where: { isActive: true } }),
    prisma.tier.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
        price: true,
        _count: { select: { users: true } },
      },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { tier: { select: { name: true } } },
    }),
    prisma.user.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: { createdAt: { gte: last30Days } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const monthlyGrowth = newUsersLastMonth > 0
    ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1)
    : newUsersThisMonth > 0 ? '100' : '0';

  const mrr = tierDistribution.reduce((sum, tier) => sum + (tier.price * tier._count.users), 0);

  const userGrowthData = processUserGrowthData(usersLast30Days);

  const tierChartData = tierDistribution.map(tier => ({
    name: tier.name,
    value: tier._count.users,
    fill: getTierColor(tier.slug),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-slate-400">Platform overview and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={totalUsers.toString()}
          change={`+${newUsersThisMonth} this month`}
          icon="👥"
          color="blue"
        />
        <StatCard
          label="Active Users"
          value={activeUsers.toString()}
          change={`${bannedUsers} banned`}
          icon="✅"
          color="green"
        />
        <StatCard
          label="Monthly Revenue"
          value={`NPR ${mrr.toLocaleString()}`}
          change="MRR"
          icon="💰"
          color="purple"
        />
        <StatCard
          label="Growth Rate"
          value={`${monthlyGrowth}%`}
          change="vs last month"
          icon="📈"
          color={parseFloat(monthlyGrowth) >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">User Growth (Last 30 Days)</h2>
          <UserGrowthChart data={userGrowthData} />
        </div>
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tier Distribution</h2>
          <TierDistributionChart data={tierChartData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tier Breakdown</h2>
          <div className="space-y-4">
            {tierDistribution.map((tier) => (
              <div key={tier.slug} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTierColor(tier.slug) }} />
                  <span className="text-slate-300">{tier.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-medium">{tier._count.users}</span>
                  <span className="text-slate-400 text-sm ml-2">
                    ({totalUsers > 0 ? ((tier._count.users / totalUsers) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Revenue by Tier</h2>
          <div className="space-y-4">
            {tierDistribution.map((tier) => {
              const tierRevenue = tier.price * tier._count.users;
              return (
                <div key={tier.slug} className="flex items-center justify-between">
                  <span className="text-slate-300">{tier.name}</span>
                  <div className="text-right">
                    <span className="text-white font-medium">NPR {tierRevenue.toLocaleString()}</span>
                    <span className="text-slate-400 text-sm ml-2">/mo</span>
                  </div>
                </div>
              );
            })}
            <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-white font-semibold">Total MRR</span>
              <span className="text-green-400 font-bold">NPR {mrr.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <QuickStat label="Active Tiers" value={totalTiers.toString()} />
            <QuickStat label="Avg Users/Tier" value={(totalUsers / totalTiers || 0).toFixed(1)} />
            <QuickStat label="Avg Revenue/User" value={`NPR ${(mrr / totalUsers || 0).toFixed(2)}`} />
            <QuickStat
              label="Free Users"
              value={tierDistribution.find(t => t.slug === 'free')?._count.users.toString() || '0'}
            />
            <QuickStat
              label="Paid Users"
              value={(totalUsers - (tierDistribution.find(t => t.slug === 'free')?._count.users || 0)).toString()}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Signups</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Tier</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{user.name || 'Anonymous'}</p>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                      {user.tier.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-sm">
                    {format(new Date(user.createdAt), 'MMM d, yyyy h:mm a')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  change,
  icon,
  color,
}: {
  label: string;
  value: string;
  change: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'red';
}) {
  const colorClasses: Record<string, string> = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red:    'from-red-500 to-red-600',
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-slate-400">{change}</p>
      <div className={`h-1 bg-gradient-to-r ${colorClasses[color]} rounded-full mt-3`} />
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function getTierColor(slug: string): string {
  const colors: Record<string, string> = {
    free:     '#3b82f6',
    pro:      '#22c55e',
    business: '#a855f7',
  };
  return colors[slug] || '#64748b';
}

// Matches UserGrowthChart's expected prop shape: { date: string; users: number }
interface UserGrowthPoint {
  date: string;
  users: number;
}

function processUserGrowthData(
  rawData: { createdAt: Date; _count: { id: number } }[]
): UserGrowthPoint[] {
  // Build a lookup map: "MMM d" → total signups that day
  const countByDay = new Map<string, number>();

  rawData.forEach((item) => {
    const key = format(new Date(item.createdAt), 'MMM d');
    countByDay.set(key, (countByDay.get(key) ?? 0) + item._count.id);
  });

  // Generate one entry per day for the last 30 days
  const data: UserGrowthPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const key = format(date, 'MMM d');
    data.push({
      date: key,
      users: countByDay.get(key) ?? 0,
    });
  }

  return data;
}