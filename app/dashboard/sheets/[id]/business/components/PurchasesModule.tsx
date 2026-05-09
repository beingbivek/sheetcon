// app/dashboard/sheets/[id]/business/components/PurchasesModule.tsx

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BusinessConfig, Connection } from '../BusinessApp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Purchase {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string | null;
  supplierName: string | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  transportCost: number;
  customsCost: number;
  storageCost: number;
  otherExpenses: number;
  landedCost: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  imageUrl: string | null;
  notes: string | null;
  createdAt: string;
  items?: PurchaseItem[];
}

interface Product {
  id: string;
  name: string;
  unit: string | null;
  costPrice: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  total: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PurchasesModuleProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchasesModule({
  connection,
  config,
  fmt,
}: PurchasesModuleProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [uploadingBill, setUploadingBill] = useState(false);
  const billRef = useRef<HTMLInputElement>(null);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [taxPercent, setTaxPercent] = useState('0');
  const [transportCost, setTransportCost] = useState('0');
  const [customsCost, setCustomsCost] = useState('0');
  const [storageCost, setStorageCost] = useState('0');
  const [otherExpenses, setOtherExpenses] = useState('0');
  const [amountPaid, setAmountPaid] = useState('');
  const [status, setStatus] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>('PAID');
  const [notes, setNotes] = useState('');
  const [billImageUrl, setBillImageUrl] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [purRes, prodRes, supRes] = await Promise.all([
        fetch(`/api/user/sheets/${connection.id}/business/purchases`),
        fetch(`/api/user/sheets/${connection.id}/business/products`),
        fetch(`/api/user/sheets/${connection.id}/business/suppliers`),
      ]);
      const [purData, prodData, supData] = await Promise.all([
        purRes.json(),
        prodRes.json(),
        supRes.json(),
      ]);
      if (!purRes.ok) throw new Error(purData.error ?? 'Failed to load purchases');
      setPurchases(purData.purchases ?? []);
      setProducts(prodData.products ?? []);
      setSuppliers(supData.suppliers ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setSupplierId('');
    setSupplierName('');
    setDate(new Date().toISOString().split('T')[0]);
    setCartItems([]);
    setTaxPercent('0');
    setTransportCost('0');
    setCustomsCost('0');
    setStorageCost('0');
    setOtherExpenses('0');
    setAmountPaid('');
    setStatus('PAID');
    setNotes('');
    setBillImageUrl('');
    setFormError('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const addCartItem = () => {
    setCartItems(prev => [
      ...prev,
      { productId: '', productName: '', quantity: '1', unitPrice: '', total: 0 },
    ]);
  };

  const updateCartItem = (idx: number, field: keyof CartItem, value: string) => {
    setCartItems(prev => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          item.productName = product.name;
          item.unitPrice = String(product.costPrice);
        }
      }
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      item.total = qty * price;
      next[idx] = item;
      return next;
    });
  };

  const removeCartItem = (idx: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = cartItems.reduce((s, i) => s + i.total, 0);
  const taxAmt = (subtotal * (parseFloat(taxPercent) || 0)) / 100;
  const extras =
    (parseFloat(transportCost) || 0) +
    (parseFloat(customsCost) || 0) +
    (parseFloat(storageCost) || 0) +
    (parseFloat(otherExpenses) || 0);
  const landedCost = subtotal + taxAmt + extras;
  const total = landedCost;
  const due = total - (parseFloat(amountPaid) || 0);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Bill image must be under 5MB');
      return;
    }
    setUploadingBill(true);
    setFormError('');
    try {
      const base64Data = await fileToBase64(file);
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'purchase-bill',
            base64Data,
            referenceId: `purchase_${Date.now()}`,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setBillImageUrl(data.url);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setUploadingBill(false);
    }
  };

  const handleSave = async () => {
    if (cartItems.length === 0) {
      setFormError('Add at least one item');
      return;
    }
    const invalidItems = cartItems.filter(
      i => !i.productId || !i.quantity || !i.unitPrice
    );
    if (invalidItems.length > 0) {
      setFormError('All items must have a product, quantity, and price');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const paid = parseFloat(amountPaid) || 0;
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/purchases`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            supplierId: supplierId || null,
            supplierName: supplierName || null,
            subtotal,
            taxPercent: parseFloat(taxPercent) || 0,
            taxAmount: taxAmt,
            transportCost: parseFloat(transportCost) || 0,
            customsCost: parseFloat(customsCost) || 0,
            storageCost: parseFloat(storageCost) || 0,
            otherExpenses: parseFloat(otherExpenses) || 0,
            landedCost,
            total,
            amountPaid: paid,
            amountDue: Math.max(0, due),
            status,
            imageUrl: billImageUrl || null,
            notes: notes.trim() || null,
            items: cartItems.map(i => ({
              productId: i.productId,
              productName: i.productName,
              quantity: parseFloat(i.quantity),
              unitPrice: parseFloat(i.unitPrice),
              total: i.total,
            })),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save purchase');
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (purchaseId: string) => {
    if (!confirm('Delete this purchase? Stock will be reversed. This cannot be undone.'))
      return;
    setDeletingId(purchaseId);
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/purchases/${purchaseId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
      if (viewingPurchase?.id === purchaseId) setViewingPurchase(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    const found = suppliers.find(s => s.id === id);
    setSupplierName(found?.name ?? '');
  };

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.invoiceNumber.toLowerCase().includes(q) ||
      (p.supplierName ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      PAID: 'bg-emerald-100 text-emerald-700',
      PARTIAL: 'bg-amber-100 text-amber-700',
      UNPAID: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s] ?? 'bg-slate-100 text-slate-600'}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Purchases</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {purchases.length} purchase order{purchases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Purchase
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice or supplier..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
            <p className="text-slate-500 text-sm">Loading purchases...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl block mb-3">🛒</span>
          <p className="text-slate-600 font-medium mb-1">
            {search || statusFilter !== 'ALL'
              ? 'No purchases match your filters'
              : 'No purchases yet'}
          </p>
          <p className="text-slate-400 text-sm mb-4">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Record your first purchase to start tracking inventory'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              New Purchase
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Invoice</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Supplier</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Landed Cost</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{purchase.invoiceNumber}</p>
                      <p className="text-xs text-slate-400">
                        {(purchase.items?.length ?? 0)} item{(purchase.items?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {purchase.supplierName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                      {new Date(purchase.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-slate-900">
                        {fmt(purchase.landedCost)}
                      </p>
                      {purchase.amountDue > 0 && (
                        <p className="text-xs text-red-500">
                          Due: {fmt(purchase.amountDue)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(purchase.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingPurchase(purchase)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          disabled={deletingId === purchase.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === purchase.id ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">New Purchase Order</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Supplier">
                  <select
                    value={supplierId}
                    onChange={e => handleSupplierChange(e.target.value)}
                    className={iCls}
                  >
                    <option value="">No supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Purchase Date">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className={iCls}
                  />
                </FormField>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    Items *
                  </label>
                  <button
                    onClick={addCartItem}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Item
                  </button>
                </div>

                {cartItems.length === 0 ? (
                  <button
                    onClick={addCartItem}
                    className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm"
                  >
                    + Click to add items
                  </button>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div className="col-span-3 sm:col-span-1">
                            <select
                              value={item.productId}
                              onChange={e => updateCartItem(idx, 'productId', e.target.value)}
                              className={iCls}
                            >
                              <option value="">Select product</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => updateCartItem(idx, 'quantity', e.target.value)}
                              placeholder="Qty"
                              className={iCls}
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e => updateCartItem(idx, 'unitPrice', e.target.value)}
                              placeholder="Unit price"
                              className={iCls}
                            />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 pt-2">
                          <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                            {fmt(item.total)}
                          </p>
                          <button
                            onClick={() => removeCartItem(idx)}
                            className="text-xs text-red-400 hover:text-red-600 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expenses */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  Additional Expenses (Landed Cost)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label={`Tax (%)`}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={taxPercent}
                      onChange={e => setTaxPercent(e.target.value)}
                      placeholder="0"
                      className={iCls}
                    />
                  </FormField>
                  <FormField label={`Transport (${config.currencySymbol})`}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={transportCost}
                      onChange={e => setTransportCost(e.target.value)}
                      placeholder="0"
                      className={iCls}
                    />
                  </FormField>
                  <FormField label={`Customs (${config.currencySymbol})`}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={customsCost}
                      onChange={e => setCustomsCost(e.target.value)}
                      placeholder="0"
                      className={iCls}
                    />
                  </FormField>
                  <FormField label={`Storage (${config.currencySymbol})`}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={storageCost}
                      onChange={e => setStorageCost(e.target.value)}
                      placeholder="0"
                      className={iCls}
                    />
                  </FormField>
                  <FormField label={`Other (${config.currencySymbol})`}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={otherExpenses}
                      onChange={e => setOtherExpenses(e.target.value)}
                      placeholder="0"
                      className={iCls}
                    />
                  </FormField>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium text-slate-900">{fmt(subtotal)}</span>
                </div>
                {taxAmt > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax ({taxPercent}%)</span>
                    <span className="font-medium text-slate-900">{fmt(taxAmt)}</span>
                  </div>
                )}
                {extras > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Additional Expenses</span>
                    <span className="font-medium text-slate-900">{fmt(extras)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-blue-200">
                  <span className="text-blue-900">Total Landed Cost</span>
                  <span className="text-blue-900">{fmt(landedCost)}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={`Amount Paid (${config.currencySymbol})`}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    placeholder={fmt(total)}
                    className={iCls}
                  />
                </FormField>
                <FormField label="Payment Status">
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className={iCls}
                  >
                    <option value="PAID">Paid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="UNPAID">Unpaid</option>
                  </select>
                </FormField>
              </div>

              {due > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-red-700 font-medium">Amount Due</span>
                  <span className="text-red-700 font-bold">{fmt(Math.max(0, due))}</span>
                </div>
              )}

              <FormField label="Notes">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  className={iCls}
                />
              </FormField>

              {/* Bill Image */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bill / Invoice Image
                </label>
                <input
                  ref={billRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBillUpload}
                />
                {billImageUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={billImageUrl}
                      alt="bill"
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                    />
                    <div>
                      <p className="text-sm text-emerald-600 font-medium">
                        ✓ Bill uploaded
                      </p>
                      <button
                        onClick={() => setBillImageUrl('')}
                        className="text-xs text-red-500 hover:underline mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => billRef.current?.click()}
                    disabled={uploadingBill}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 text-sm disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploadingBill ? 'Uploading...' : 'Upload Bill Image'}
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploadingBill}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {saving ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {viewingPurchase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {viewingPurchase.invoiceNumber}
                </h3>
                <p className="text-sm text-slate-400">
                  {new Date(viewingPurchase.date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(viewingPurchase.status)}
                <button
                  onClick={() => setViewingPurchase(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewingPurchase.supplierName && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Supplier</p>
                    <p className="font-medium text-slate-900">{viewingPurchase.supplierName}</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Date</p>
                  <p className="font-medium text-slate-900">
                    {new Date(viewingPurchase.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Items */}
              {viewingPurchase.items && viewingPurchase.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Items</p>
                  <div className="space-y-2">
                    {viewingPurchase.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                          <p className="text-xs text-slate-400">
                            {item.quantity} × {fmt(item.unitPrice)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{fmt(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost breakdown */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span>{fmt(viewingPurchase.subtotal)}</span>
                </div>
                {viewingPurchase.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax ({viewingPurchase.taxPercent}%)</span>
                    <span>{fmt(viewingPurchase.taxAmount)}</span>
                  </div>
                )}
                {viewingPurchase.transportCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Transport</span>
                    <span>{fmt(viewingPurchase.transportCost)}</span>
                  </div>
                )}
                {viewingPurchase.customsCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Customs</span>
                    <span>{fmt(viewingPurchase.customsCost)}</span>
                  </div>
                )}
                {viewingPurchase.storageCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Storage</span>
                    <span>{fmt(viewingPurchase.storageCost)}</span>
                  </div>
                )}
                {viewingPurchase.otherExpenses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other</span>
                    <span>{fmt(viewingPurchase.otherExpenses)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-blue-200">
                  <span className="text-blue-900">Landed Cost</span>
                  <span className="text-blue-900">{fmt(viewingPurchase.landedCost)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-slate-600">Paid</span>
                  <span className="text-emerald-700 font-medium">{fmt(viewingPurchase.amountPaid)}</span>
                </div>
                {viewingPurchase.amountDue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Due</span>
                    <span className="text-red-600 font-medium">{fmt(viewingPurchase.amountDue)}</span>
                  </div>
                )}
              </div>

              {/* Bill image */}
              {viewingPurchase.imageUrl && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    Bill Image
                  </p>
                  <a
                    href={viewingPurchase.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={viewingPurchase.imageUrl}
                      alt="bill"
                      className="w-full rounded-xl border border-slate-200 hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              )}

              {viewingPurchase.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{viewingPurchase.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingPurchase(null);
                  handleDelete(viewingPurchase.id);
                }}
                className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const iCls =
  'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function FormField({
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