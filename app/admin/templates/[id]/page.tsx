// app/admin/templates/[id]/page.tsx

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import ToggleTemplateStatus from '@/components/admin/ToggleTemplateStatus';

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
  });

  if (!template) {
    notFound();
  }

  // Get usage count
  const usageCount = await prisma.sheetConnection.count({
    where: { templateId: template.slug },
  });

  const configSchema = template.configSchema as any;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="text-6xl">{template.icon}</span>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white">{template.name}</h1>
              {template.isActive ? (
                <span className="px-3 py-1 bg-green-500/10 text-green-400 text-sm font-medium rounded-full">
                  Active
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-500/10 text-red-400 text-sm font-medium rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-slate-400">v{template.version} • Slug: {template.slug}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/admin/templates/${template.id}/edit`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Edit Template
          </Link>
          <ToggleTemplateStatus template={template} />
        </div>
      </div>

      {/* Description */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
        <p className="text-slate-300">{template.description || 'No description provided'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard label="Active Usage" value={`${usageCount} sheets`} icon="📊" />
        <StatCard label="Features" value={template.features.length.toString()} icon="⚡" />
        <StatCard label="Version" value={template.version} icon="🏷️" />
        <StatCard label="Created" value={format(new Date(template.createdAt), 'MMM d, yyyy')} icon="📅" />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Features */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Features</h2>
          <div className="flex flex-wrap gap-2">
            {template.features.map((feature: string) => (
              <span
                key={feature}
                className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* UI Configuration */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">UI Configuration</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Primary Color</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border border-slate-600"
                  style={{ backgroundColor: template.primaryColor }}
                />
                <span className="text-white font-mono">{template.primaryColor}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Layout</span>
              <span className="text-white">{configSchema?.ui?.layout || 'sidebar'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pages</span>
              <span className="text-white">{configSchema?.ui?.pages?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schema Configuration */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sheet Configuration</h2>
        
        {configSchema?.requiredSheets?.map((sheet: any, index: number) => (
          <div key={index} className="mb-6 last:mb-0">
            <h3 className="text-md font-medium text-white mb-3 flex items-center gap-2">
              <span className="text-xl">📋</span>
              {sheet.displayName || sheet.name}
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-4 text-sm font-medium text-slate-400">Column</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-slate-400">Type</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-slate-400">Required</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-slate-400">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.columns?.map((column: any, colIndex: number) => (
                    <tr key={colIndex} className="border-b border-slate-700/50">
                      <td className="py-2 px-4">
                        <span className="text-white font-medium">{column.label}</span>
                        <span className="text-slate-500 text-xs ml-2">({column.key})</span>
                      </td>
                      <td className="py-2 px-4">
                        <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                          {column.type}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        {column.required ? (
                          <span className="text-green-400">Yes</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-sm text-slate-400">
                        {column.options?.join(', ') || column.default || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Raw JSON (Collapsible) */}
      <details className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <summary className="text-lg font-semibold text-white cursor-pointer">
          Raw Configuration JSON
        </summary>
        <pre className="mt-4 p-4 bg-slate-900 rounded-lg overflow-x-auto text-sm text-slate-300">
          {JSON.stringify(template.configSchema, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}