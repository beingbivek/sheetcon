// app/dashboard/sheets/[id]/business/components/BusinessSetup.tsx
"use client";

import { useState } from "react";
import type { BusinessConfig, Connection } from "../BusinessApp";

interface Props {
  connection: Connection;
  currentConfig: BusinessConfig;
  onSaved: (config: BusinessConfig) => void;
  onClose: () => void;
}

export default function BusinessSetup({
  connection,
  currentConfig,
  onSaved,
  onClose,
}: Props) {
  const [form, setForm] = useState<BusinessConfig>({ ...currentConfig });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof BusinessConfig, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/config`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      // Merge returned config back to BusinessConfig shape
      const saved: BusinessConfig = {
        businessName:      data.config.businessName      ?? "",
        logoUrl:           data.config.logoUrl           ?? "",
        address:           data.config.address           ?? "",
        phone:             data.config.phone             ?? "",
        email:             data.config.email             ?? "",
        website:           data.config.website           ?? "",
        taxNumber:         data.config.taxNumber         ?? "",
        currency:          data.config.currency          ?? "NPR",
        currencySymbol:    data.config.currencySymbol    ?? "Rs.",
        paymentQrUrl:      data.config.paymentQrUrl      ?? "",
        invoicePrefix:     data.config.invoicePrefix     ?? "INV",
        invoiceFooter:     data.config.invoiceFooter     ?? "",
        lowStockThreshold: data.config.lowStockThreshold ?? "5",
        defaultTaxRate:    data.config.defaultTaxRate    ?? "0",
      };
      onSaved(saved);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    field,
    type = "text",
    placeholder,
    hint,
  }: {
    label: string;
    field: keyof BusinessConfig;
    type?: string;
    placeholder?: string;
    hint?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Business Settings
          </h2>
          <p className="text-sm text-slate-500">
            Configure your business profile and tax defaults
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Business Info */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
            Business Info
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Business Name" field="businessName" placeholder="My Shop" />
            <Field label="Phone" field="phone" placeholder="+977 98XXXXXXXX" />
            <Field label="Email" field="email" type="email" placeholder="shop@example.com" />
            <Field label="Website" field="website" placeholder="https://myshop.com" />
            <div className="sm:col-span-2">
              <Field label="Address" field="address" placeholder="Kathmandu, Nepal" />
            </div>
            <Field label="Tax / VAT Number" field="taxNumber" placeholder="PAN / VAT number" />
            <Field label="Logo URL" field="logoUrl" placeholder="https://…/logo.png" />
          </div>
        </section>

        {/* Currency & Tax */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
            Currency & Tax
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Currency Code"
              field="currency"
              placeholder="NPR"
              hint="e.g. NPR, USD, INR"
            />
            <Field
              label="Currency Symbol"
              field="currencySymbol"
              placeholder="Rs."
              hint="Displayed before amounts"
            />
            {/* ── TASK 5: Default Tax Rate ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Default Tax Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.defaultTaxRate}
                  onChange={(e) => set("defaultTaxRate", e.target.value)}
                  placeholder="0"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                  %
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Auto-applied to new bills. e.g. 13 for 13% VAT. Can be
                overridden per bill.
              </p>
            </div>
            <Field
              label="Low Stock Threshold"
              field="lowStockThreshold"
              type="number"
              placeholder="5"
              hint="Alert when stock drops below this"
            />
          </div>
        </section>

        {/* Invoice */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
            Invoice
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Invoice Prefix"
              field="invoicePrefix"
              placeholder="INV"
              hint="e.g. INV → INV-20260515-0001"
            />
            <Field
              label="Payment QR URL"
              field="paymentQrUrl"
              placeholder="https://…/qr.png"
            />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Invoice Footer
              </label>
              <textarea
                value={form.invoiceFooter}
                onChange={(e) => set("invoiceFooter", e.target.value)}
                placeholder="Thank you for your business!"
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}