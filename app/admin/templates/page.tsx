// app/admin/templates/page.tsx

import { prisma } from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Count usage per template
  const templateUsage = await prisma.sheetConnection.groupBy({
    by: ['templateId'],
    _count: { id: true },
  });

  const usageMap = new Map(
    templateUsage.map((t) => [t.templateId, t._count.id])
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Templates</h1>
          <p className="text-slate-400">Manage app templates and configurations</p>
        </div>
        <Link
          href="/admin/templates/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          + Create Template
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Templates"
          value={templates.length.toString()}
          icon="📋"
          color="blue"
        />
        <StatCard
          label="Active"
          value={templates.filter((t) => t.isActive).length.toString()}
          icon="✅"
          color="green"
        />
        <StatCard
          label="Inactive"
          value={templates.filter((t) => !t.isActive).length.toString()}
          icon="⏸️"
          color="yellow"
        />
        <StatCard
          label="Total Usage"
          value={templateUsage.reduce((sum, t) => sum + t._count.id, 0).toString()}
          icon="📊"
          color="purple"
        />
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            usageCount={usageMap.get(template.slug) || 0}
          />
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
          <span className="text-6xl mb-4 block">📋</span>
          <p className="text-slate-400 mb-4">No templates found</p>
          <Link
            href="/admin/templates/new"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Create Your First Template
          </Link>
        </div>
      )}
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
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
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

function TemplateCard({
  template,
  usageCount,
}: {
  template: any;
  usageCount: number;
}) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-blue-500 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{template.icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">{template.name}</h3>
            <p className="text-sm text-slate-400">v{template.version}</p>
          </div>
        </div>
        {template.isActive ? (
          <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded">
            Active
          </span>
        ) : (
          <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded">
            Inactive
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
        {template.description || 'No description'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-xs text-slate-500">Usage</p>
          <p className="text-lg font-semibold text-white">{usageCount} sheets</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-xs text-slate-500">Features</p>
          <p className="text-lg font-semibold text-white">{template.features.length}</p>
        </div>
      </div>

      {/* Features Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {template.features.slice(0, 3).map((feature: string) => (
          <span
            key={feature}
            className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
          >
            {feature}
          </span>
        ))}
        {template.features.length > 3 && (
          <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
            +{template.features.length - 3} more
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/admin/templates/${template.id}`}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg transition-colors text-sm font-medium"
        >
          View Details
        </Link>
        <Link
          href={`/admin/templates/${template.id}/edit`}
          className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-center rounded-lg transition-colors text-sm font-medium"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}