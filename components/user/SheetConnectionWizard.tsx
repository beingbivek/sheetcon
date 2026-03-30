// components/user/SheetConnectionWizard.tsx

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

const TEMPLATES = [
  {
    id: 'finance',
    name: 'Personal Finance Tracker',
    description: 'Track income, expenses, and budgets with beautiful charts',
    icon: '💰',
    color: 'green',
    features: ['Transaction tracking', 'Category breakdown', 'Monthly reports', 'PDF statements'],
  },
  {
    id: 'inventory',
    name: 'Small Business Inventory',
    description: 'Manage products, create invoices, and track sales',
    icon: '📦',
    color: 'blue',
    features: ['Product catalog', 'Invoice generator', 'Stock alerts', 'Sales reports'],
  },
];

export default function SheetConnectionWizard({ user }: SheetConnectionWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('method');
  const [connectionMethod, setConnectionMethod] = useState<'create' | 'existing' | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newSheetName, setNewSheetName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userSheets, setUserSheets] = useState<any[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);

  // Step 1: Choose connection method
  const handleMethodSelect = async (method: 'create' | 'existing') => {
    setConnectionMethod(method);
    setError('');

    if (method === 'existing') {
      // Fetch user's Google Sheets
      setLoadingSheets(true);
      try {
        const response = await fetch('/api/user/sheets/list');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch sheets');
        }

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

  // Step 2: Select existing sheet
  const handleSheetSelect = (sheet: any) => {
    setSelectedSheet(sheet);
    setCurrentStep('template');
  };

  // Step 3: Select template
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setCurrentStep('confirm');
  };

  // Step 4: Confirm and connect
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect sheet');
      }

      // Redirect to the new sheet
      router.push(`/dashboard/sheets/${data.connectionId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Progress Steps */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <StepIndicator
            step={1}
            title="Method"
            active={currentStep === 'method'}
            completed={currentStep !== 'method'}
          />
          <div className="flex-1 h-1 bg-slate-200 mx-2">
            <div
              className={`h-full bg-blue-600 transition-all ${
                currentStep !== 'method' ? 'w-full' : 'w-0'
              }`}
            />
          </div>
          <StepIndicator
            step={2}
            title={connectionMethod === 'create' ? 'Template' : 'Select Sheet'}
            active={currentStep === 'sheets' || (currentStep === 'template' && connectionMethod === 'create')}
            completed={currentStep === 'template' || currentStep === 'confirm'}
          />
          <div className="flex-1 h-1 bg-slate-200 mx-2">
            <div
              className={`h-full bg-blue-600 transition-all ${
                currentStep === 'template' || currentStep === 'confirm' ? 'w-full' : 'w-0'
              }`}
            />
          </div>
          <StepIndicator
            step={3}
            title={connectionMethod === 'create' ? 'Confirm' : 'Template'}
            active={currentStep === 'template' && connectionMethod === 'existing'}
            completed={currentStep === 'confirm'}
          />
          {connectionMethod === 'existing' && (
            <>
              <div className="flex-1 h-1 bg-slate-200 mx-2">
                <div
                  className={`h-full bg-blue-600 transition-all ${
                    currentStep === 'confirm' ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
              <StepIndicator
                step={4}
                title="Confirm"
                active={currentStep === 'confirm'}
                completed={false}
              />
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Choose Method */}
        {currentStep === 'method' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">How would you like to connect?</h2>
            
            <button
              onClick={() => handleMethodSelect('create')}
              className="w-full p-6 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">✨</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Create New Sheet</h3>
                  <p className="text-slate-600">
                    We'll create a new Google Sheet with the correct structure for your chosen template
                  </p>
                  <span className="inline-block mt-2 text-blue-600 font-medium">Recommended for beginners →</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect('existing')}
              className="w-full p-6 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">📊</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Use Existing Sheet</h3>
                  <p className="text-slate-600">
                    Connect an existing Google Sheet. You'll map columns to template fields
                  </p>
                  <span className="inline-block mt-2 text-slate-600 font-medium">For advanced users →</span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Select Existing Sheet */}
        {currentStep === 'sheets' && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Select a Google Sheet</h2>
            
            {loadingSheets ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-slate-600 mt-4">Loading your sheets...</p>
              </div>
            ) : userSheets.length > 0 ? (
              <div className="space-y-3">
                {userSheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    onClick={() => handleSheetSelect(sheet)}
                    className="w-full p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📊</span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{sheet.name}</p>
                        <p className="text-sm text-slate-500">{sheet.id}</p>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📋</span>
                <p className="text-slate-600 mb-4">No sheets found in your Google Drive</p>
                <button
                  onClick={() => setCurrentStep('method')}
                  className="text-blue-600 hover:underline"
                >
                  ← Go back and create a new sheet
                </button>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => setCurrentStep('method')}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Template */}
        {currentStep === 'template' && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Choose a Template</h2>
            
            {connectionMethod === 'create' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sheet Name
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="e.g., My Finance Tracker"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-4xl mb-3 block">{template.icon}</span>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{template.name}</h3>
                  <p className="text-slate-600 text-sm mb-4">{template.description}</p>
                  <ul className="space-y-1">
                    {template.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-xs text-slate-600">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setCurrentStep(connectionMethod === 'create' ? 'method' : 'sheets')}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                ← Back
              </button>
              {connectionMethod === 'create' && selectedTemplate && (
                <button
                  onClick={() => setCurrentStep('confirm')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Continue →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {currentStep === 'confirm' && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Confirm Connection</h2>
            
            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Method</p>
                  <p className="font-medium text-slate-900">
                    {connectionMethod === 'create' ? 'Create New Sheet' : 'Use Existing Sheet'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Sheet Name</p>
                  <p className="font-medium text-slate-900">
                    {connectionMethod === 'create' ? newSheetName || 'Untitled' : selectedSheet?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Template</p>
                  <p className="font-medium text-slate-900">
                    {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <span className="text-yellow-600">⚠️</span>
                <div>
                  <p className="font-medium text-yellow-900 mb-1">Important</p>
                  <p className="text-sm text-yellow-800">
                    Once connected, the template is locked to this sheet and cannot be changed. 
                    Make sure you've selected the correct template!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('template')}
                disabled={isLoading}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

function StepIndicator({
  step,
  title,
  active,
  completed,
}: {
  step: number;
  title: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
          completed
            ? 'bg-blue-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-slate-200 text-slate-600'
        }`}
      >
        {completed ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          step
        )}
      </div>
      <p className={`text-xs mt-1 ${active || completed ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
        {title}
      </p>
    </div>
  );
}