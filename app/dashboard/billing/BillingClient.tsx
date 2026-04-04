// app/dashboard/billing/BillingClient.tsx

'use client';

import { useState } from 'react';

interface Tier {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  maxSheets: number;
  maxCrudPerDay: number;
  exportToPdf: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  description?: string | null;
}

interface BillingClientProps {
  currentTier: Tier;
  usage: {
    sheetsUsed: number;
    crudToday: number;
  };
  allTiers: Tier[];
}

export default function BillingClient({ currentTier, usage, allTiers }: BillingClientProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const formatLimit = (value: number) => value === -1 ? 'Unlimited' : value.toString();

  const handleUpgrade = (tierId: string) => {
    // In production, this would integrate with a payment gateway
    alert('Payment integration coming soon! Contact support for manual upgrade.');
    setSelectedTier(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Billing & Plans</h1>
        <p className="text-slate-600 mt-1">Manage your subscription and view usage</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Current Plan</p>
            <h2 className="text-2xl font-bold text-slate-900">{currentTier.name}</h2>
            <p className="text-lg text-blue-600 font-semibold mt-1">
              {currentTier.price === 0 ? 'Free' : `₹${currentTier.price}/month`}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              currentTier.slug === 'free' 
                ? 'bg-slate-100 text-slate-700'
                : currentTier.slug === 'pro'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {currentTier.name}
            </span>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Sheets Used</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage.sheetsUsed} / {formatLimit(currentTier.maxSheets)}
            </p>
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full"
                style={{ 
                  width: currentTier.maxSheets === -1 
                    ? '10%' 
                    : `${Math.min(100, (usage.sheetsUsed / currentTier.maxSheets) * 100)}%` 
                }}
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">CRUD Operations Today</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage.crudToday} / {formatLimit(currentTier.maxCrudPerDay)}
            </p>
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-600 rounded-full"
                style={{ 
                  width: currentTier.maxCrudPerDay === -1 
                    ? '5%' 
                    : `${Math.min(100, (usage.crudToday / currentTier.maxCrudPerDay) * 100)}%` 
                }}
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Features</p>
            <div className="mt-2 space-y-1">
              <p className={`text-sm ${currentTier.exportToPdf ? 'text-green-600' : 'text-slate-400'}`}>
                {currentTier.exportToPdf ? '✓' : '✗'} PDF Export
              </p>
              <p className={`text-sm ${currentTier.customBranding ? 'text-green-600' : 'text-slate-400'}`}>
                {currentTier.customBranding ? '✓' : '✗'} Custom Branding
              </p>
              <p className={`text-sm ${currentTier.prioritySupport ? 'text-green-600' : 'text-slate-400'}`}>
                {currentTier.prioritySupport ? '✓' : '✗'} Priority Support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {allTiers.map((tier) => {
          const isCurrent = tier.id === currentTier.id;
          const isUpgrade = tier.price > currentTier.price;
          
          return (
            <div
              key={tier.id}
              className={`bg-white rounded-xl border-2 p-6 relative ${
                isCurrent 
                  ? 'border-blue-500' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                  Current Plan
                </span>
              )}

              <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {tier.price === 0 ? 'Free' : `₹${tier.price}`}
                {tier.price > 0 && <span className="text-sm font-normal text-slate-500">/month</span>}
              </p>
              
              {tier.description && (
                <p className="text-sm text-slate-600 mt-2">{tier.description}</p>
              )}

              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  <span>{formatLimit(tier.maxSheets)} Sheets</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  <span>{formatLimit(tier.maxCrudPerDay)} CRUD/day</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={tier.exportToPdf ? 'text-green-500' : 'text-slate-300'}>
                    {tier.exportToPdf ? '✓' : '✗'}
                  </span>
                  <span className={!tier.exportToPdf ? 'text-slate-400' : ''}>PDF Export</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={tier.customBranding ? 'text-green-500' : 'text-slate-300'}>
                    {tier.customBranding ? '✓' : '✗'}
                  </span>
                  <span className={!tier.customBranding ? 'text-slate-400' : ''}>Custom Branding</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={tier.prioritySupport ? 'text-green-500' : 'text-slate-300'}>
                    {tier.prioritySupport ? '✓' : '✗'}
                  </span>
                  <span className={!tier.prioritySupport ? 'text-slate-400' : ''}>Priority Support</span>
                </li>
              </ul>

              <button
                onClick={() => isUpgrade && handleUpgrade(tier.id)}
                disabled={isCurrent || !isUpgrade}
                className={`w-full mt-6 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    : isUpgrade
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isCurrent ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Info */}
      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-2">💳 Payment Information</h3>
        <p className="text-slate-600">
          Payment integration is coming soon. For now, contact{' '}
          <a href="mailto:support@sheetcon.com" className="text-blue-600 hover:underline">
            support@sheetcon.com
          </a>{' '}
          to upgrade your plan manually.
        </p>
      </div>
    </div>
  );
}