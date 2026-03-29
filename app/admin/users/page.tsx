// app/admin/users/page.tsx

import { prisma } from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page as string) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Get today's start for "active today" calculation
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Get this month's start
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Fetch all stats in parallel
  const [
    users,
    totalUsers,
    bannedUsers,
    activeToday,
    newThisMonth,
  ] = await Promise.all([
    // Users for current page
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        tier: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    // Total users count
    prisma.user.count(),
    // Banned users count
    prisma.user.count({
      where: { isBanned: true },
    }),
    // Active today (users who had CRUD activity today)
    prisma.user.count({
      where: {
        lastCrudReset: { gte: todayStart },
        crudCountToday: { gt: 0 },
      },
    }),
    // New users this month
    prisma.user.count({
      where: {
        createdAt: { gte: monthStart },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
          <p className="text-slate-400">Manage user accounts and subscriptions</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/users/export"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
          >
            Export CSV
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={totalUsers.toString()}
          icon="👥"
          color="blue"
        />
        <StatCard
          label="Active Today"
          value={activeToday.toString()}
          icon="⚡"
          color="green"
        />
        <StatCard
          label="New This Month"
          value={newThisMonth.toString()}
          icon="📈"
          color="purple"
        />
        <StatCard
          label="Banned Users"
          value={bannedUsers.toString()}
          icon="🚫"
          color="red"
        />
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">User</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Tier</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Status</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Joined</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-white font-medium">{user.name || 'Anonymous'}</p>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <TierBadge tier={user.tier} />
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge isActive={user.isActive} isBanned={user.isBanned} />
                  </td>
                  <td className="py-4 px-6 text-slate-300">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/users/${user.id}/edit`}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No users found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Showing {skip + 1}-{Math.min(skip + limit, totalUsers)} of {totalUsers} users
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/users?page=${page - 1}`}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/users?page=${page + 1}`}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
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

function TierBadge({ tier }: { tier: { name: string; slug: string } }) {
  const colors: Record<string, string> = {
    free: 'bg-blue-500/10 text-blue-400',
    pro: 'bg-green-500/10 text-green-400',
    business: 'bg-purple-500/10 text-purple-400',
  };

  const colorClass = colors[tier.slug] || 'bg-slate-700 text-slate-300';

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${colorClass}`}>
      {tier.name}
    </span>
  );
}

function StatusBadge({ isActive, isBanned }: { isActive: boolean; isBanned: boolean }) {
  if (isBanned) {
    return (
      <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded-full">
        Banned
      </span>
    );
  }

  return isActive ? (
    <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">
      Active
    </span>
  ) : (
    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-medium rounded-full">
      Inactive
    </span>
  );
}