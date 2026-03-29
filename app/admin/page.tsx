// app/admin/page.tsx

import { prisma } from '@/lib/db';

export default async function AdminDashboardPage() {
  // Fetch statistics
  const [userCount, tierCount, adminCount] = await Promise.all([
    prisma.user.count(),
    prisma.tier.count(),
    prisma.admin.count(),
  ]);

  // Fetch recent tiers
  const recentTiers = await prisma.tier.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

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
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Active Tiers"
          value={tierCount.toString()}
          icon="🏷️"
          color="green"
        />
        <StatCard
          title="Admins"
          value={adminCount.toString()}
          icon="👨‍💼"
          color="purple"
        />
        <StatCard
          title="Revenue (MRR)"
          value="₹0"
          icon="💰"
          color="yellow"
        />
      </div>

      {/* Recent Tiers */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Tiers</h2>
        <div className="space-y-3">
          {recentTiers.map((tier) => (
            <div
              key={tier.id}
              className="flex items-center justify-between p-4 bg-slate-900 rounded-lg"
            >
              <div>
                <p className="font-medium text-white">{tier.name}</p>
                <p className="text-sm text-slate-400">{tier.description || 'No description'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">
                  ₹{tier.price}/month
                </p>
                <p className="text-sm text-slate-400">
                  {tier.currentUserCount} users
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <div className={`h-1 bg-gradient-to-r ${colorClasses[color]} rounded-full mt-4`} />
    </div>
  );
}