// app/admin/tiers/page.tsx

import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function TiersPage() {
  const tiers = await prisma.tier.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tiers</h1>
          <p className="text-slate-400">Manage subscription plans and pricing</p>
        </div>
        <Link
          href="/admin/tiers/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          + Create Tier
        </Link>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} userCount={tier._count.users} />
        ))}
      </div>

      {/* Empty State */}
      {tiers.length === 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
          <p className="text-slate-400 mb-4">No tiers found</p>
          <Link
            href="/admin/tiers/new"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Create Your First Tier
          </Link>
        </div>
      )}
    </div>
  );
}

function TierCard({ tier, userCount }: { tier: any; userCount: number }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-blue-500 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">{tier.name}</h3>
          <p className="text-sm text-slate-400">{tier.description || 'No description'}</p>
        </div>
        {tier.isActive ? (
          <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded">
            Active
          </span>
        ) : (
          <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded">
            Inactive
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mb-6">
        <p className="text-3xl font-bold text-white">
          ₹{tier.price}
          <span className="text-lg font-normal text-slate-400">/month</span>
        </p>
      </div>

      {/* Features */}
      <div className="space-y-2 mb-6">
        <Feature
          icon="📊"
          label="Max Sheets"
          value={tier.maxSheets === -1 ? 'Unlimited' : tier.maxSheets}
        />
        <Feature
          icon="📝"
          label="Max Templates"
          value={tier.maxTemplates === -1 ? 'Unlimited' : tier.maxTemplates}
        />
        <Feature
          icon="⚡"
          label="CRUD/Day"
          value={tier.maxCrudPerDay === -1 ? 'Unlimited' : tier.maxCrudPerDay.toLocaleString()}
        />
        <Feature
          icon="👥"
          label="Users"
          value={`${userCount} / ${tier.maxUsers === -1 ? '∞' : tier.maxUsers}`}
        />
      </div>

      {/* Additional Features */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tier.customBranding && (
          <Badge icon="🎨" label="Custom Branding" />
        )}
        {tier.prioritySupport && (
          <Badge icon="⭐" label="Priority Support" />
        )}
        {tier.exportToPdf && (
          <Badge icon="📄" label="PDF Export" />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/admin/tiers/${tier.id}/edit`}
          className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-center rounded-lg transition-colors text-sm font-medium"
        >
          Edit
        </Link>
        <Link
          href={`/admin/tiers/${tier.id}`}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg transition-colors text-sm font-medium"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

function Feature({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="flex items-center text-sm">
      <span className="mr-2">{icon}</span>
      <span className="text-slate-400">{label}:</span>
      <span className="ml-auto text-white font-medium">{value}</span>
    </div>
  );
}

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded flex items-center gap-1">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}