// app/dashboard/sheets/[id]/business/components/BusinessSetup.tsx

'use client';

import { useState, useRef } from 'react';
import type { BusinessConfig, Connection } from '../BusinessApp';

interface BusinessSetupProps {
  connection: Connection;
  currentConfig: BusinessConfig;
  onSaved: (config: BusinessConfig) => void;
  onClose?: () => void;
}

type Tab = 'business' | 'billing' | 'payment';

const CURRENCIES = [
  { code: 'NPR', symbol: 'Rs.', name: 'Nepali Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
];

export default function BusinessSetup({
  connection,
  currentConfig,
  onSaved,
  onClose,
}: BusinessSetupProps) {
  const [activeTab, setActiveTab] = useState<Tab>('business');
  const [form, setForm] = useState<BusinessConfig>({ ...currentConfig });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState(currentConfig.logoUrl || '');
  const [qrPreview, setQrPreview] = useState(currentConfig.paymentQrUrl || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);

  const update = (key: keyof BusinessConfig, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleCurrencyChange = (code: string) => {
    const found = CURRENCIES.find(c => c.code === code);
    if (found) {
      setForm(prev => ({
        ...prev,
        currency: found.code,
        currencySymbol: found.symbol,
      }));
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be under 5MB');
      return;
    }
    setUploadingLogo(true);
    setError('');
    try {
      const base64Data = await fileToBase64(file);
      setLogoPreview(base64Data);
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'logo', base64Data }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setLogoPreview(data.url);
      update('logoUrl', data.url);
    } catch (err: any) {
      setError(err.message);
      setLogoPreview(currentConfig.logoUrl || '');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('QR image must be under 5MB');
      return;
    }
    setUploadingQr(true);
    setError('');
    try {
      const base64Data = await fileToBase64(file);
      setQrPreview(base64Data);
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'payment-qr', base64Data }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setQrPreview(data.url);
      update('paymentQrUrl', data.url);
    } catch (err: any) {
      setError(err.message);
      setQrPreview(currentConfig.paymentQrUrl || '');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSave = async () => {
    if (!form.businessName.trim()) {
      setError('Business name is required');
      setActiveTab('business');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      onSaved(form);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'business', label: 'Business Info', icon: '🏢' },
    { id: 'billing', label: 'Billing & Currency', icon: '💱' },
    { id: 'payment', label: 'Payment QR', icon: '📱' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Business Settings
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Configure your business profile for invoices and reports.
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-slate-100 rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Tab: Business Info */}
          {activeTab === 'business' && (
            <div className="space-y-5">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Business Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🏢</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/jpg,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      onClick={() => logoRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </button>
                    <p className="text-xs text-slate-400 mt-1">
                      JPG, PNG or WebP · Max 5MB
                    </p>
                  </div>
                </div>
              </div>

              <Field label="Business Name *">
                <input
                  type="text"
                  value={form.businessName}
                  onChange={e => update('businessName', e.target.value)}
                  placeholder="My Business Pvt. Ltd."
                  className={inputCls}
                />
              </Field>

              <Field label="Address">
                <textarea
                  value={form.address}
                  onChange={e => update('address', e.target.value)}
                  placeholder="Kathmandu, Nepal"
                  rows={2}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="+977-9800000000"
                    className={inputCls}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="info@mybusiness.com"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Website">
                  <input
                    type="text"
                    value={form.website}
                    onChange={e => update('website', e.target.value)}
                    placeholder="www.mybusiness.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Tax / PAN Number">
                  <input
                    type="text"
                    value={form.taxNumber}
                    onChange={e => update('taxNumber', e.target.value)}
                    placeholder="123456789"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Tab: Billing & Currency */}
          {activeTab === 'billing' && (
            <div className="space-y-5">
              <Field label="Currency">
                <select
                  value={form.currency}
                  onChange={e => handleCurrencyChange(e.target.value)}
                  className={inputCls}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} — {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Invoice Prefix">
                  <input
                    type="text"
                    value={form.invoicePrefix}
                    onChange={e => update('invoicePrefix', e.target.value)}
                    placeholder="INV"
                    className={inputCls}
                  />
                </Field>
                <Field label="Low Stock Threshold">
                  <input
                    type="number"
                    min={0}
                    value={form.lowStockThreshold}
                    onChange={e => update('lowStockThreshold', e.target.value)}
                    placeholder="5"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Invoice Footer Message">
                <textarea
                  value={form.invoiceFooter}
                  onChange={e => update('invoiceFooter', e.target.value)}
                  placeholder="Thank you for your business!"
                  rows={3}
                  className={inputCls}
                />
              </Field>

              {/* Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                  Invoice Number Preview
                </p>
                <p className="font-mono text-slate-900 text-sm">
                  {form.invoicePrefix || 'INV'}-
                  {new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001
                </p>
              </div>
            </div>
          )}

          {/* Tab: Payment QR */}
          {activeTab === 'payment' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  Upload your payment QR code (eSewa, Khalti, bank QR, etc.).
                  It will be displayed on every invoice during checkout.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Payment QR Code
                </label>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-48 h-48 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                    {qrPreview ? (
                      <img
                        src={qrPreview}
                        alt="QR"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center">
                        <span className="text-4xl block mb-2">📱</span>
                        <p className="text-xs text-slate-400">No QR uploaded</p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={qrRef}
                    type="file"
                    accept="image/jpg,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleQrUpload}
                  />
                  <button
                    onClick={() => qrRef.current?.click()}
                    disabled={uploadingQr}
                    className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {uploadingQr ? 'Uploading...' : 'Upload QR Image'}
                  </button>
                  {qrPreview && (
                    <button
                      onClick={() => {
                        setQrPreview('');
                        update('paymentQrUrl', '');
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove QR
                    </button>
                  )}
                  <p className="text-xs text-slate-400 text-center">
                    JPG, PNG or WebP · Max 5MB
                    <br />
                    Recommended: square image, white background
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || uploadingLogo || uploadingQr}
            className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}