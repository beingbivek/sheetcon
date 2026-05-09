// app/dashboard/sheets/[id]/business/components/BillPrint.tsx

'use client';

import { useRef, useEffect } from 'react';
import type { BusinessConfig } from '../BusinessApp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SaleItem {
  id: string;
  productName: string;
  variation: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string | null;
  subtotal: number;
  discountType: 'PERCENT' | 'FIXED' | null;
  discountValue: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  items?: SaleItem[];
}

interface BillPrintProps {
  sale: Sale;
  config: BusinessConfig;
  fmt: (n: number) => string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillPrint({
  sale,
  config,
  fmt,
  onClose,
}: BillPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'bill-print-styles';
    style.textContent = `
      @media print {
        body > * { display: none !important; }
        #bill-print-container { display: block !important; }
        #bill-print-container * { visibility: visible; }
        .no-print { display: none !important; }
        @page { margin: 10mm; size: auto; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('bill-print-styles');
      if (el) el.remove();
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Controls */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sales
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Invoice
        </button>
      </div>

      {/* Bill */}
      <div className="max-w-2xl mx-auto p-4 sm:p-8" id="bill-print-container" ref={printRef}>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt="Logo"
                  className="w-16 h-16 object-contain rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                  {config.businessName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {config.businessName || 'My Business'}
                </h1>
                {config.address && (
                  <p className="text-sm text-slate-500">{config.address}</p>
                )}
                {config.phone && (
                  <p className="text-sm text-slate-500">📞 {config.phone}</p>
                )}
                {config.email && (
                  <p className="text-sm text-slate-500">✉ {config.email}</p>
                )}
                {config.website && (
                  <p className="text-sm text-slate-500">🌐 {config.website}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-blue-600">INVOICE</h2>
              <p className="text-sm text-slate-500 mt-1 font-mono">
                {sale.invoiceNumber}
              </p>
              {config.taxNumber && (
                <p className="text-xs text-slate-400 mt-1">
                  PAN: {config.taxNumber}
                </p>
              )}
            </div>
          </div>

          {/* ── Invoice Info ── */}
          <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Bill To
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {sale.customerName ?? 'Walk-in Customer'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Invoice Details
              </p>
              <p className="text-sm text-slate-700">
                <span className="text-slate-400">Date: </span>
                {new Date(sale.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-slate-700">
                <span className="text-slate-400">Status: </span>
                <span className={
                  sale.status === 'PAID'
                    ? 'text-emerald-600 font-semibold'
                    : sale.status === 'PARTIAL'
                    ? 'text-amber-600 font-semibold'
                    : 'text-red-600 font-semibold'
                }>
                  {sale.status}
                </span>
              </p>
              {sale.paymentMethod && (
                <p className="text-sm text-slate-700">
                  <span className="text-slate-400">Payment: </span>
                  {sale.paymentMethod}
                </p>
              )}
            </div>
          </div>

          {/* ── Items Table ── */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  #
                </th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Item
                </th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Qty
                </th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Rate
                </th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {(sale.items ?? []).map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-3 text-sm text-slate-500">{idx + 1}</td>
                  <td className="py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {item.productName}
                    </p>
                    {item.variation && (
                      <p className="text-xs text-slate-400">{item.variation}</p>
                    )}
                  </td>
                  <td className="py-3 text-sm text-slate-700 text-right">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-sm text-slate-700 text-right">
                    {fmt(item.unitPrice)}
                  </td>
                  <td className="py-3 text-sm font-semibold text-slate-900 text-right">
                    {fmt(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Totals ── */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900">{fmt(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>
                    Discount
                    {sale.discountType === 'PERCENT'
                      ? ` (${sale.discountValue}%)`
                      : ''}
                  </span>
                  <span>-{fmt(sale.discountAmount)}</span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax ({sale.taxPercent}%)</span>
                  <span className="text-slate-900">{fmt(sale.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-slate-900">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">{fmt(sale.total)}</span>
              </div>
              {sale.amountPaid > 0 && sale.amountPaid !== sale.total && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Paid</span>
                    <span className="text-emerald-600">{fmt(sale.amountPaid)}</span>
                  </div>
                  {sale.amountDue > 0 && (
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-red-600">Balance Due</span>
                      <span className="text-red-600">{fmt(sale.amountDue)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── QR Code ── */}
          {config.paymentQrUrl && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-6">
              <img
                src={config.paymentQrUrl}
                alt="Payment QR"
                className="w-24 h-24 object-contain border border-slate-200 rounded-lg bg-white p-1"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5">
                  Scan to Pay
                </p>
                <p className="text-xs text-slate-500">
                  Scan the QR code above to make a digital payment.
                </p>
                {config.phone && (
                  <p className="text-xs text-slate-400 mt-1">
                    Or transfer to: {config.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {sale.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-amber-600 font-semibold mb-0.5">Note</p>
              <p className="text-sm text-amber-900">{sale.notes}</p>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">
              {config.invoiceFooter || 'Thank you for your business!'}
            </p>
            {config.website && (
              <p className="text-xs text-slate-400 mt-1">{config.website}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}