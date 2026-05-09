// components/user/SheetConnectionWizard.tsx (COMPLETE REPLACEMENT)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SheetConnectionWizardProps {
  user: {
    id: string;
    accessToken: string | null;
    tier: {
      maxTemplates: number;
    };
  };
}

type Step = 'method' | 'sheets' | 'template' | 'confirm';
type ConnectionMethod = 'create' | 'existing';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  features: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'finance',
    name: 'Personal Finance Tracker',
    description: 'Track income, expenses, and budgets with beautiful charts',
    icon: '💰',
    features: [
      'Transaction tracking',
      'Category breakdown',
      'Monthly reports',
      'PDF statements',
    ],
  },
  {
    id: 'inventory',
    name: 'Small Business Inventory',
    description: 'Manage products, create invoices, and track sales',
    icon: '📦',
    features: [
      'Product catalog',
      'Invoice generator',
      'Stock alerts',
      'Sales reports',
    ],
  },
  {
    id: 'business-management',
    name: 'Business Management Suite',
    description:
      'Full ERP-style system for managing suppliers, inventory, customers, and sales',
    icon: '🏢',
    badge: 'New',
    badgeColor: 'bg-emerald-500',
    features: [
      'Supplier & purchase management',
      'Product catalog with images',
      'Customer CRM',
      'Point-of-sale interface',
      'Landed cost calculator',
      'Full analytics & reports',
      'Printable invoices with QR',
      'Low stock alerts',
    ],
  },
];

export default function SheetConnectionWizard({
  user,
}: SheetConnectionWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('method');
  const [connectionMethod, setConnectionMethod] =
    useState<ConnectionMethod | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newSheetName, setNewSheetName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userSheets, setUserSheets] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingSheets, setLoadingSheets] = useState(false);

  const handleMethodSelect = async (method: ConnectionMethod) => {
    setConnectionMethod(method);
    setError('');

    if (method === 'existing') {
      setLoadingSheets(true);
      try {
        const response = await fetch('/api/user/sheets/list');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch sheets');
        setUserSheets(data.sheets || []);
        setCurrentStep('sheets');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingSheets(false);
      }
    } else {
      setCurrentStep('template');
    }
  };

  const handleSheetSelect = (sheet: { id: string; name: string }) => {
    setSelectedSheet(sheet);
    setCurrentStep('template');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (connectionMethod === 'create') {
      setCurrentStep('confirm');
    } else {
      setCurrentStep('confirm');
    }
  };

  const handleConnect = async () => {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/sheets/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: connectionMethod,
          sheetId: selectedSheet?.id,
          sheetName: newSheetName || selectedSheet?.name,
          templateId: selectedTemplate,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to connect sheet');

      router.push(`/dashboard/sheets/${data.connectionId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const selectedTemplateData = TEMPLATES.find(t => t.id === selectedTemplate);

  const steps =
    connectionMethod === 'existing'
      ? ['Method', 'Select Sheet', 'Template', 'Confirm']
      : ['Method', 'Template', 'Confirm'];

  const stepIndex: Record<Step, number> = {
    method: 0,
    sheets: 1,
    template: connectionMethod === 'existing' ? 2 : 1,
    confirm: connectionMethod === 'existing' ? 3 : 2,
  };

  const currentStepIndex = stepIndex[currentStep];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Progress */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i < currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : i === currentStepIndex
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {i < currentStepIndex ? (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <p
                  className={`text-xs mt-1 font-medium ${
                    i <= currentStepIndex
                      ? 'text-blue-600'
                      : 'text-slate-400'
                  }`}
                >
                  {step}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-4 bg-slate-200">
                  <div
                    className={`h-full bg-blue-600 transition-all duration-300 ${
                      i < currentStepIndex ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Step: Method */}
        {currentStep === 'method' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              How would you like to connect?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Choose how you want to get started with SheetCon.
            </p>

            <button
              onClick={() => handleMethodSelect('create')}
              className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-200 transition-colors">
                  ✨
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    Create New Sheet
                  </h3>
                  <p className="text-slate-500 text-sm">
                    We'll create a new Google Sheet with the correct structure
                    automatically. Perfect for getting started quickly.
                  </p>
                  <span className="inline-block mt-2 text-sm text-blue-600 font-medium">
                    Recommended →
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect('existing')}
              className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-slate-200 transition-colors">
                  📊
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    Use Existing Sheet
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Connect an existing Google Sheet from your Drive. Headers
                    will be written automatically.
                  </p>
                  <span className="inline-block mt-2 text-sm text-slate-500 font-medium">
                    Advanced →
                  </span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step: Select Existing Sheet */}
        {currentStep === 'sheets' && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Select a Google Sheet
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Choose which sheet to connect from your Google Drive.
            </p>

            {loadingSheets ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-slate-500">Loading your sheets...</p>
              </div>
            ) : userSheets.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {userSheets.map(sheet => (
                  <button
                    key={sheet.id}
                    onClick={() => handleSheetSelect(sheet)}
                    className="w-full p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center gap-3"
                  >
                    <span className="text-2xl">📊</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {sheet.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{sheet.id}</p>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <span className="text-5xl mb-4 block">📋</span>
                <p className="text-slate-600 mb-4">
                  No sheets found in your Google Drive
                </p>
                <button
                  onClick={() => setCurrentStep('method')}
                  className="text-blue-600 hover:underline text-sm"
                >
                  ← Go back and create a new sheet
                </button>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => setCurrentStep('method')}
                className="px-4 py-2 text-slate-500 hover:text-slate-900 text-sm"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Step: Select Template */}
        {currentStep === 'template' && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Choose a Template
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Select the template that best fits your needs. This cannot be
              changed after connecting.
            </p>

            {connectionMethod === 'create' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sheet Name{' '}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={e => setNewSheetName(e.target.value)}
                  placeholder="e.g., My Business Manager"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`p-5 border-2 rounded-xl text-left transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">
                          {template.name}
                        </h3>
                        {template.badge && (
                          <span
                            className={`text-xs text-white px-2 py-0.5 rounded-full font-medium ${template.badgeColor}`}
                          >
                            {template.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mb-3">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {template.features.map((f, i) => (
                          <span
                            key={i}
                            className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 transition-colors ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedTemplate === template.id && (
                        <svg
                          className="w-full h-full text-white p-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() =>
                  setCurrentStep(
                    connectionMethod === 'create' ? 'method' : 'sheets'
                  )
                }
                className="px-4 py-2 text-slate-500 hover:text-slate-900 text-sm"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {currentStep === 'confirm' && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Confirm Connection
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Review your selection before connecting.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-sm text-slate-500">Method</span>
                <span className="text-sm font-medium text-slate-900">
                  {connectionMethod === 'create'
                    ? '✨ Create New Sheet'
                    : '📊 Use Existing Sheet'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-sm text-slate-500">Sheet Name</span>
                <span className="text-sm font-medium text-slate-900 truncate max-w-xs">
                  {connectionMethod === 'create'
                    ? newSheetName || 'Auto-named'
                    : selectedSheet?.name}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Template</span>
                <span className="text-sm font-medium text-slate-900">
                  {selectedTemplateData?.icon} {selectedTemplateData?.name}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
                <div>
                  <p className="font-medium text-amber-900 text-sm mb-1">
                    Template is permanent
                  </p>
                  <p className="text-sm text-amber-700">
                    Once connected, the template cannot be changed for this
                    sheet. Make sure you've selected the correct template.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('template')}
                disabled={isLoading}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
              >
                ← Back
              </button>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isLoading && (
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isLoading ? 'Connecting...' : 'Connect Sheet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}