// app/dashboard/billing/BillingClient.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Tier {
  id: string;
  name: string;
  slug: string;
  price: number;
  annualPrice?: number | null;
  currency: string;
  maxSheets: number;
  maxCrudPerDay: number;
  exportToPdf: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  description?: string | null;
}

interface PaymentHistory {
  id: string;
  invoiceId: string;
  status: string;
  amountSnapshot: number;
  requestedBillingCycle: string;
  requestedTierName: string;
  createdAt: string;
  expiresAt: string;
}

interface BillingClientProps {
  currentTier: Tier;
  usage: { sheetsUsed: number; crudToday: number };
  allTiers: Tier[];
}

const STATUS_COLORS: Record<string, string> = {
  AWAITING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW:     'bg-blue-100 text-blue-800',
  APPROVED:         'bg-green-100 text-green-800',
  REJECTED:         'bg-red-100 text-red-800',
  EXPIRED:          'bg-gray-100 text-gray-700',
  CANCELLED:        'bg-slate-100 text-slate-700',
};

export default function BillingClient({ currentTier, usage, allTiers }: BillingClientProps) {
  const router = useRouter();

  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Confirmation modal state
  const [confirmTier, setConfirmTier] = useState<Tier | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch('/api/user/payments');
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch {
      // silent
    } finally {
      setLoadingPayments(false);
    }
  };

  const formatLimit = (value: number) => (value === -1 ? 'Unlimited' : value.toString());

  // Step 1 — show confirmation modal (no API call yet)
  const handleUpgradeClick = (tier: Tier) => {
    setConfirmTier(tier);
    setCreateError(null);
  };

  // Step 2 — user confirmed, now create invoice and redirect
  const handleConfirmUpgrade = async () => {
    if (!confirmTier) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/user/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: confirmTier.id, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment request');

      // Redirect to invoice page — InvoiceClient shows QR + upload form
      router.push(`/dashboard/billing/${data.payment.invoiceId}`);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const closeModal = () => {
    if (creating) return; // don't close while submitting
    setConfirmTier(null);
    setCreateError(null);
  };

  const confirmPrice =
    confirmTier
      ? billingCycle === 'ANNUAL' && confirmTier.annualPrice
        ? confirmTier.annualPrice
        : confirmTier?.price
      : 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Billing & Plans</h1>
        <p className="text-slate-600 mt-1">Manage your subscription and view payment history</p>
      </div>

      {/* ── Current Plan ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Current Plan</p>
            <h2 className="text-2xl font-bold text-slate-900">{currentTier.name}</h2>
            <p className="text-lg text-blue-600 font-semibold mt-1">
              {currentTier.price === 0
                ? 'Free'
                : `${currentTier.currency} ${currentTier.price}/month`}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            currentTier.slug === 'free' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {currentTier.name}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Sheets Used</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage.sheetsUsed} / {formatLimit(currentTier.maxSheets)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">CRUD Operations Today</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage.crudToday} / {formatLimit(currentTier.maxCrudPerDay)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Features</p>
            <div className="mt-2 space-y-1">
              <p className={`text-sm ${currentTier.exportToPdf ? 'text-green-600' : 'text-slate-400'}`}>
                {currentTier.exportToPdf ? '✓' : '✗'} PDF Export
              </p>
              <p className={`text-sm ${currentTier.prioritySupport ? 'text-green-600' : 'text-slate-400'}`}>
                {currentTier.prioritySupport ? '✓' : '✗'} Priority Support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Billing Cycle Toggle ─────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Available Plans</h2>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('ANNUAL')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              billingCycle === 'ANNUAL'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual{' '}
            <span className="text-green-600 text-xs font-semibold">-20%</span>
          </button>
        </div>
      </div>

      {/* ── Tier Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {allTiers.map((tier) => {
          const isCurrent = tier.id === currentTier.id;
          const price =
            billingCycle === 'ANNUAL' && tier.annualPrice
              ? tier.annualPrice
              : tier.price;
          const isUpgrade = price > currentTier.price;

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-xl border-2 p-6 relative transition-all ${
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
                {price === 0 ? (
                  'Free'
                ) : (
                  <>
                    {tier.currency} {price}
                    <span className="text-sm font-normal text-slate-500">
                      /{billingCycle === 'ANNUAL' ? 'year' : 'month'}
                    </span>
                  </>
                )}
              </p>
              {tier.description && (
                <p className="text-sm text-slate-500 mt-2">{tier.description}</p>
              )}

              <ul className="mt-5 space-y-2.5">
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="text-green-500 font-bold">✓</span>
                  {formatLimit(tier.maxSheets)} Sheets
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="text-green-500 font-bold">✓</span>
                  {formatLimit(tier.maxCrudPerDay)} CRUD/day
                </li>
                <li className={`flex items-center gap-2 text-sm ${tier.exportToPdf ? 'text-slate-700' : 'text-slate-400'}`}>
                  <span className={tier.exportToPdf ? 'text-green-500 font-bold' : ''}>
                    {tier.exportToPdf ? '✓' : '✗'}
                  </span>
                  PDF Export
                </li>
                <li className={`flex items-center gap-2 text-sm ${tier.prioritySupport ? 'text-slate-700' : 'text-slate-400'}`}>
                  <span className={tier.prioritySupport ? 'text-green-500 font-bold' : ''}>
                    {tier.prioritySupport ? '✓' : '✗'}
                  </span>
                  Priority Support
                </li>
              </ul>

              <button
                onClick={() => isUpgrade && handleUpgradeClick(tier)}
                disabled={isCurrent || !isUpgrade}
                className={`w-full mt-6 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : isUpgrade
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isCurrent ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Payment History ──────────────────────────── */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Payment History</h2>
        {loadingPayments ? (
          <div className="bg-slate-50 rounded-lg p-6 text-center">
            <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-slate-500 bg-slate-50 p-4 rounded-lg text-sm">
            No payment requests yet.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Invoice</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/dashboard/billing/${p.invoiceId}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.invoiceId}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {p.requestedTierName}{' '}
                      <span className="text-slate-400 text-xs capitalize">
                        ({p.requestedBillingCycle.toLowerCase()})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      NPR {p.amountSnapshot.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[p.status] || STATUS_COLORS.CANCELLED
                      }`}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Upgrade Confirmation Modal ───────────────── */}
      {confirmTier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl">
            <div className="p-6">
              {/* Modal header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Confirm Upgrade</h2>
                  <p className="text-slate-500 text-sm mt-0.5">
                    Review your order before proceeding to payment
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  disabled={creating}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none disabled:opacity-30"
                >
                  ×
                </button>
              </div>

              {/* Order summary */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-semibold text-slate-900">{confirmTier.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Billing</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {billingCycle.toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Features</span>
                  <div className="text-right text-slate-700 space-y-0.5">
                    <p>{formatLimit(confirmTier.maxSheets)} sheets</p>
                    <p>{formatLimit(confirmTier.maxCrudPerDay)} CRUD/day</p>
                    {confirmTier.exportToPdf && <p>PDF Export</p>}
                    {confirmTier.prioritySupport && <p>Priority Support</p>}
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="font-semibold text-slate-700">Amount Due</span>
                  <span className="text-xl font-bold text-slate-900">
                    {confirmTier.currency} {confirmPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* What happens next */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5">
                <p className="text-blue-800 text-xs leading-relaxed">
                  Clicking <strong>Proceed to Payment</strong> will generate an invoice.
                  You'll then see a QR code to pay via eSewa and a form to upload your
                  payment screenshot for verification.
                </p>
              </div>

              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{createError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  disabled={creating}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpgrade}
                  disabled={creating}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating invoice...
                    </>
                  ) : (
                    'Proceed to Payment →'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}