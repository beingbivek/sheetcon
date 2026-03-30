// components/admin/TemplateForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TemplateFormProps {
  template?: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string;
    primaryColor: string;
    version: string;
    isActive: boolean;
    isPublic: boolean;
    features: string[];
    configSchema: any;
  };
}

const AVAILABLE_FEATURES = [
  'dashboard',
  'transactions',
  'products',
  'invoices',
  'customers',
  'reports',
  'pdf_export',
  'charts',
  'notifications',
];

const ICONS = ['📋', '💰', '📦', '🛒', '📊', '📈', '🏪', '💳', '📝', '⚙️'];

export default function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'schema' | 'features'>('basic');

  const [formData, setFormData] = useState({
    name: template?.name || '',
    slug: template?.slug || '',
    description: template?.description || '',
    icon: template?.icon || '📋',
    primaryColor: template?.primaryColor || '#3b82f6',
    version: template?.version || '1.0.0',
    isActive: template?.isActive ?? true,
    isPublic: template?.isPublic ?? true,
    features: template?.features || [],
    configSchema: JSON.stringify(template?.configSchema || getDefaultSchema(), null, 2),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Parse JSON
      let parsedSchema;
      try {
        parsedSchema = JSON.parse(formData.configSchema);
      } catch (e) {
        throw new Error('Invalid JSON in configuration schema');
      }

      const url = template
        ? `/api/admin/templates/${template.id}`
        : '/api/admin/templates';

      const method = template ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          configSchema: parsedSchema,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      router.push('/admin/templates');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: template ? prev.slug : name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  };

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`pb-3 px-2 border-b-2 transition-colors ${
            activeTab === 'basic'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Basic Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('features')}
          className={`pb-3 px-2 border-b-2 transition-colors ${
            activeTab === 'features'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Features
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`pb-3 px-2 border-b-2 transition-colors ${
            activeTab === 'schema'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Schema Configuration
        </button>
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Personal Finance Tracker"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
                disabled={!!template}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="e.g., finance"
              />
              {template && (
                <p className="text-xs text-slate-500 mt-1">Slug cannot be changed after creation</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of what this template does"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 text-xl rounded-lg border ${
                      formData.icon === icon
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Version
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 rounded"
              />
              <span className="ml-3 text-slate-300">Active</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 rounded"
              />
              <span className="ml-3 text-slate-300">Public (visible to users)</span>
            </label>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <p className="text-slate-400 mb-4">Select the features enabled for this template:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_FEATURES.map((feature) => (
              <button
                key={feature}
                type="button"
                onClick={() => toggleFeature(feature)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  formData.features.includes(feature)
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="capitalize">{feature.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schema Tab */}
      {activeTab === 'schema' && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <p className="text-slate-400 mb-4">
            Define the template's data schema (sheets, columns, types):
          </p>
          <textarea
            value={formData.configSchema}
            onChange={(e) => setFormData({ ...formData, configSchema: e.target.value })}
            rows={25}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter JSON configuration..."
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mt-6">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isLoading}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {template ? 'Update Template' : 'Create Template'}
        </button>
      </div>
    </form>
  );
}

function getDefaultSchema() {
  return {
    requiredSheets: [
      {
        name: 'Data',
        displayName: 'Main Data',
        columns: [
          { key: 'id', label: 'ID', type: 'auto-increment', required: true },
          { key: 'name', label: 'Name', type: 'string', required: true },
          { key: 'created_at', label: 'Created At', type: 'date', required: true },
        ],
      },
    ],
    ui: {
      layout: 'sidebar',
      pages: ['dashboard'],
    },
    features: {
      dashboard: { enabled: true },
    },
  };
}