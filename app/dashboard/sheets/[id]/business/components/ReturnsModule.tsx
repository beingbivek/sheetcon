// app/dashboard/sheets/[id]/business/components/ReturnsModule.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BusinessConfig, Connection } from '../BusinessApp';

type ReturnType = 'CUSTOMER_RETURN' | 'SUPPLIER_RETURN';
type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESTOCKED';
type Condition = 'DAMAGED' | 'GOOD' | 'DEFECTIVE';

interface ReturnItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  condition: Condition;
}

interface Return {
  id: string;
  returnNumber: string;
  returnType: ReturnType;
  date: string;
  saleId: string | null;
  saleInvoice: string | null;
  customerId: string | null;
  customerName: string | null;
  purchaseId: string | null;
  purchaseInvoice: string | null;
  supplierId: string | null;
  supplierName: string | null;
  reason: string | null;
  notes: string | null;
  status: ReturnStatus;
  totalValue: number;
  refundAmount: number;
  refundMethod: string | null;
  createdAt: string;
  items?: ReturnItem[];
}

interface Product { id: string; name: string; sellingPrice: number; costPrice: number; }
interface Supplier { id: string; name: string; }
interface Sale {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  items?: { productId: string; productName: string; quantity: number; unitPrice: number; total: number; }[];
}
interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierName: string | null;
  items?: { productId: string; productName: string; quantity: number; unitPrice: number; total: number; }[];
}

interface ReturnsModuleProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

const STATUS_COLORS: Record<ReturnStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  RESTOCKED: 'bg-emerald-100 text-emerald-700',
};

const CONDITION_COLORS: Record<Condition, string> = {
  DAMAGED: 'bg-red-100 text-red-700',
  DEFECTIVE: 'bg-orange-100 text-orange-700',
  GOOD: 'bg-emerald-100 text-emerald-700',
};

export default function ReturnsModule({ connection, config, fmt }: ReturnsModuleProps) {
  const [returns, setReturns] = useState<Return[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReturnType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [viewingReturn, setViewingReturn] = useState<Return | null>(null);
  const [showApproveModal, setShowApproveModal] = useState<Return | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form
  const [returnType, setReturnType] = useState<ReturnType>('CUSTOMER_RETURN');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('0');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [returnItems, setReturnItems] = useState<{
    productId: string; productName: string;
    quantity: string; unitPrice: string;
    total: number; condition: Condition;
  }[]>([]);

  useEffect(() => {
    if (returnType !== 'CUSTOMER_RETURN') return;

    if (!selectedSaleId) {
      setReturnItems([]);
      setCustomerName('');
      return;
    }

    const selectedSale = sales.find((s) => s.id === selectedSaleId);
    if (!selectedSale) return;

    setCustomerName(selectedSale.customerName ?? '');

    if (selectedSale.items?.length) {
      setReturnItems(
        selectedSale.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          total: item.total,
          condition: 'GOOD',
        })),
      );
    }
  }, [selectedSaleId, returnType, sales]);

  useEffect(() => {
    if (returnType !== 'SUPPLIER_RETURN') return;

    if (!selectedPurchaseId) {
      setReturnItems([]);
      setSelectedSupplierId('');
      return;
    }

    const selectedPurchase = purchases.find((p) => p.id === selectedPurchaseId);
    if (!selectedPurchase) return;

    if (selectedPurchase.supplierId) {
      setSelectedSupplierId(selectedPurchase.supplierId);
    }

    if (selectedPurchase.items?.length) {
      setReturnItems(
        selectedPurchase.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          total: item.total,
          condition: 'GOOD',
        })),
      );
    }
  }, [selectedPurchaseId, returnType, purchases]);

  useEffect(() => {
    setSelectedSaleId('');
    setSelectedPurchaseId('');
    setSelectedSupplierId('');
    setCustomerName('');
    setReturnItems([]);
  }, [returnType]);

  // Approve modal
  const [approveRefundAmount, setApproveRefundAmount] = useState('');
  const [approveRefundMethod, setApproveRefundMethod] = useState('Cash');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rRes, pRes, sRes, saRes, purRes] = await Promise.all([
        fetch(`/api/user/sheets/${connection.id}/business/returns`),
        fetch(`/api/user/sheets/${connection.id}/business/products`),
        fetch(`/api/user/sheets/${connection.id}/business/suppliers`),
        fetch(`/api/user/sheets/${connection.id}/business/sales`),
        fetch(`/api/user/sheets/${connection.id}/business/purchases`),
      ]);
      const [rData, pData, sData, saData, purData] = await Promise.all([
        rRes.json(), pRes.json(), sRes.json(), saRes.json(), purRes.json(),
      ]);
      if (!rRes.ok) throw new Error(rData.error ?? 'Failed to load returns');
      setReturns(rData.returns ?? []);
      setProducts(pData.products ?? []);
      setSuppliers(sData.suppliers ?? []);
      setSales(saData.sales ?? []);
      setPurchases(purData.purchases ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addReturnItem = () => {
    setReturnItems(prev => [...prev, {
      productId: '', productName: '', quantity: '1', unitPrice: '', total: 0, condition: 'DAMAGED',
    }]);
  };

  const updateReturnItem = (idx: number, field: string, value: string) => {
    setReturnItems(prev => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          item.productName = product.name;
          item.unitPrice = String(returnType === 'CUSTOMER_RETURN' ? product.sellingPrice : product.costPrice);
        }
      }
      item.total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
      next[idx] = item;
      return next;
    });
  };

  const totalValue = returnItems.reduce((s, i) => s + i.total, 0);

  const handleCreateReturn = async () => {
    if (returnItems.length === 0) { setFormError('Add at least one item'); return; }
    setSaving(true); setFormError('');
    try {
      const selectedSale = sales.find(s => s.id === selectedSaleId);
      const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
      const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

      const res = await fetch(`/api/user/sheets/${connection.id}/business/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnType, date,
          saleId: returnType === 'CUSTOMER_RETURN' ? selectedSaleId || null : null,
          saleInvoice: returnType === 'CUSTOMER_RETURN' ? selectedSale?.invoiceNumber || null : null,
          customerId: returnType === 'CUSTOMER_RETURN' ? null : null,
          customerName: returnType === 'CUSTOMER_RETURN' ? (selectedSale?.customerName || customerName || null) : null,
          purchaseId: returnType === 'SUPPLIER_RETURN' ? selectedPurchaseId || null : null,
          purchaseInvoice: returnType === 'SUPPLIER_RETURN' ? selectedPurchase?.invoiceNumber || null : null,
          supplierId: returnType === 'SUPPLIER_RETURN' ? selectedSupplierId || null : null,
          supplierName: returnType === 'SUPPLIER_RETURN' ? (selectedSupplier?.name || selectedPurchase?.supplierName || null) : null,
          reason: reason.trim() || null,
          notes: notes.trim() || null,
          totalValue,
          refundAmount: parseFloat(refundAmount) || 0,
          refundMethod: refundMethod || null,
          items: returnItems.map(i => ({
            productId: i.productId, productName: i.productName,
            quantity: parseFloat(i.quantity) || 0,
            unitPrice: parseFloat(i.unitPrice) || 0,
            total: i.total, condition: i.condition,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create return');
      setShowForm(false);
      setReturnItems([]); setReason(''); setNotes('');
      setSelectedSaleId(''); setSelectedPurchaseId(''); setSelectedSupplierId('');
      setCustomerName(''); setRefundAmount('0');
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!showApproveModal) return;
    setSaving(true); setFormError('');
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/returns/${showApproveModal.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refundAmount: parseFloat(approveRefundAmount) || 0,
            refundMethod: approveRefundMethod,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to approve return');
      setShowApproveModal(null);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = returns.filter(r => {
    const q = search.toLowerCase();
    const matchSearch =
      r.returnNumber.toLowerCase().includes(q) ||
      (r.customerName ?? '').toLowerCase().includes(q) ||
      (r.supplierName ?? '').toLowerCase().includes(q);
    const matchType = typeFilter === 'ALL' || r.returnType === typeFilter;
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Returns & Damages</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {returns.filter(r => r.returnType === 'CUSTOMER_RETURN').length} customer ·{' '}
            {returns.filter(r => r.returnType === 'SUPPLIER_RETURN').length} supplier returns
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Return
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: returns.filter(r => r.status === 'PENDING').length, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Approved', value: returns.filter(r => r.status === 'APPROVED').length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Restocked', value: returns.filter(r => r.status === 'RESTOCKED').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Rejected', value: returns.filter(r => r.status === 'REJECTED').length, color: 'bg-red-50 text-red-700 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search returns..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['ALL', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'ALL' ? 'All' : t === 'CUSTOMER_RETURN' ? '👤 Customer' : '🏭 Supplier'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['ALL', 'PENDING', 'RESTOCKED', 'REJECTED'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

      {/* Returns list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl block mb-3">↩</span>
          <p className="text-slate-600 font-medium mb-1">No returns found</p>
          <p className="text-slate-400 text-sm mb-4">
            {search || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try different filters' : 'Record customer or supplier returns here'}
          </p>
          {!search && typeFilter === 'ALL' && statusFilter === 'ALL' && (
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              New Return
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Return #</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Party</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Reason</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Value</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(ret => (
                  <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{ret.returnNumber}</p>
                      <p className="text-xs text-slate-400">{new Date(ret.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ret.returnType === 'CUSTOMER_RETURN' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ret.returnType === 'CUSTOMER_RETURN' ? '👤 Customer' : '🏭 Supplier'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {ret.customerName ?? ret.supplierName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-xs max-w-[150px] truncate">
                      {ret.reason ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(ret.totalValue)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ret.status]}`}>
                        {ret.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewingReturn(ret)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {ret.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setShowApproveModal(ret);
                              setApproveRefundAmount(String(ret.refundAmount || ret.totalValue));
                              setApproveRefundMethod(ret.refundMethod ?? 'Cash');
                              setFormError('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Approve & Restock"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Return Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">New Return</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>}

              {/* Type */}
              <Field label="Return Type">
                <div className="grid grid-cols-2 gap-3">
                  {(['CUSTOMER_RETURN', 'SUPPLIER_RETURN'] as const).map(t => (
                    <button key={t} onClick={() => setReturnType(t)}
                      className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        returnType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {t === 'CUSTOMER_RETURN' ? '👤 Customer Return' : '🏭 Supplier Return'}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Date">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={iCls} />
              </Field>

              {/* Linked record */}
              {returnType === 'CUSTOMER_RETURN' ? (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Linked Sale (optional)">
                    <select value={selectedSaleId} onChange={e => setSelectedSaleId(e.target.value)} className={iCls}>
                      <option value="">No linked sale</option>
                      {sales.map(s => <option key={s.id} value={s.id}>{s.invoiceNumber} — {s.customerName ?? 'Walk-in'}</option>)}
                    </select>
                  </Field>
                  <Field label="Customer Name">
                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                      placeholder="Customer name" className={iCls} />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Linked Purchase (optional)">
                    <select value={selectedPurchaseId} onChange={e => setSelectedPurchaseId(e.target.value)} className={iCls}>
                      <option value="">No linked purchase</option>
                      {purchases.map(p => <option key={p.id} value={p.id}>{p.invoiceNumber} — {p.supplierName ?? 'Unknown'}</option>)}
                    </select>
                  </Field>
                  <Field label="Supplier">
                    <select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className={iCls}>
                      <option value="">Select supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">Returned Items *</label>
                  <button onClick={addReturnItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Item
                  </button>
                </div>
                {returnItems.length === 0 ? (
                  <button onClick={addReturnItem}
                    className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm">
                    + Click to add returned items
                  </button>
                ) : (
                  <div className="space-y-3">
                    {returnItems.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select value={item.productId}
                            onChange={e => updateReturnItem(idx, 'productId', e.target.value)} className={iCls}>
                            <option value="">Select product</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <div className="flex gap-2">
                            {(['DAMAGED', 'DEFECTIVE', 'GOOD'] as Condition[]).map(c => (
                              <button key={c} onClick={() => updateReturnItem(idx, 'condition', c)}
                                className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                                  item.condition === c ? CONDITION_COLORS[c] + ' border-transparent' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}>
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" min={1} value={item.quantity}
                            onChange={e => updateReturnItem(idx, 'quantity', e.target.value)}
                            placeholder="Qty" className={iCls} />
                          <input type="number" min={0} step="0.01" value={item.unitPrice}
                            onChange={e => updateReturnItem(idx, 'unitPrice', e.target.value)}
                            placeholder="Unit price" className={iCls} />
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">{fmt(item.total)}</span>
                            <button onClick={() => setReturnItems(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {returnItems.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between text-sm font-bold">
                  <span className="text-blue-900">Total Return Value</span>
                  <span className="text-blue-900">{fmt(totalValue)}</span>
                </div>
              )}

              <Field label="Reason for Return">
                <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Damaged in transit, defective product..." className={iCls} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={`Refund Amount (${config.currencySymbol})`}>
                  <input type="number" min={0} value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)} className={iCls} />
                </Field>
                <Field label="Refund Method">
                  <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)} className={iCls}>
                    <option value="Cash">Cash</option>
                    <option value="eSewa">eSewa</option>
                    <option value="Khalti">Khalti</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Replacement">Replacement</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Additional notes..." rows={2} className={iCls} />
              </Field>
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button onClick={() => setShowForm(false)} disabled={saving}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCreateReturn} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                {saving ? 'Saving...' : 'Submit Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Approve Return</h3>
                <p className="text-sm text-slate-400">{showApproveModal.returnNumber}</p>
              </div>
              <button onClick={() => setShowApproveModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-blue-900 mb-2">What will happen:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Return status → RESTOCKED</li>
                  {showApproveModal.returnType === 'CUSTOMER_RETURN'
                    ? <li>• Stock will be <strong>restored</strong> for all returned items</li>
                    : <li>• Stock will be <strong>deducted</strong> for all returned items</li>
                  }
                  <li>• Google Sheet will be updated</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Items to be restocked:</p>
                {showApproveModal.items?.map(item => (
                  <div key={item.id} className="flex justify-between text-sm bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-700">{item.productName} × {item.quantity}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${CONDITION_COLORS[item.condition as Condition]}`}>
                      {item.condition}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label={`Refund Amount (${config.currencySymbol})`}>
                  <input type="number" min={0} value={approveRefundAmount}
                    onChange={e => setApproveRefundAmount(e.target.value)} className={iCls} />
                </Field>
                <Field label="Refund Method">
                  <select value={approveRefundMethod} onChange={e => setApproveRefundMethod(e.target.value)} className={iCls}>
                    <option value="Cash">Cash</option>
                    <option value="eSewa">eSewa</option>
                    <option value="Khalti">Khalti</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Replacement">Replacement</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button onClick={() => setShowApproveModal(null)} disabled={saving}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleApprove} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                {saving ? 'Approving...' : 'Approve & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Return Modal ── */}
      {viewingReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingReturn.returnNumber}</h3>
                <p className="text-xs text-slate-400">{new Date(viewingReturn.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewingReturn.status]}`}>
                  {viewingReturn.status}
                </span>
                <button onClick={() => setViewingReturn(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Type</p>
                  <p className="font-medium text-slate-900">
                    {viewingReturn.returnType === 'CUSTOMER_RETURN' ? '👤 Customer Return' : '🏭 Supplier Return'}
                  </p>
                </div>
                {(viewingReturn.customerName || viewingReturn.supplierName) && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">
                      {viewingReturn.returnType === 'CUSTOMER_RETURN' ? 'Customer' : 'Supplier'}
                    </p>
                    <p className="font-medium text-slate-900">
                      {viewingReturn.customerName ?? viewingReturn.supplierName}
                    </p>
                  </div>
                )}
                {viewingReturn.saleInvoice && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Linked Sale</p>
                    <p className="font-medium text-slate-900">{viewingReturn.saleInvoice}</p>
                  </div>
                )}
                {viewingReturn.purchaseInvoice && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Linked Purchase</p>
                    <p className="font-medium text-slate-900">{viewingReturn.purchaseInvoice}</p>
                  </div>
                )}
              </div>

              {viewingReturn.items && viewingReturn.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Returned Items</p>
                  <div className="space-y-2">
                    {viewingReturn.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                          <p className="text-xs text-slate-400">{item.quantity} × {fmt(item.unitPrice)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{fmt(item.total)}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CONDITION_COLORS[item.condition as Condition]}`}>
                            {item.condition}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between font-bold">
                  <span className="text-blue-900">Total Value</span>
                  <span className="text-blue-900">{fmt(viewingReturn.totalValue)}</span>
                </div>
                {viewingReturn.refundAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Refund Amount</span>
                    <span className="text-emerald-700 font-medium">{fmt(viewingReturn.refundAmount)}</span>
                  </div>
                )}
                {viewingReturn.refundMethod && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Refund Method</span>
                    <span className="text-slate-700">{viewingReturn.refundMethod}</span>
                  </div>
                )}
              </div>

              {viewingReturn.reason && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">Reason</p>
                  <p className="text-sm text-amber-900">{viewingReturn.reason}</p>
                </div>
              )}

              {viewingReturn.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-medium mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{viewingReturn.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button onClick={() => setViewingReturn(null)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
                Close
              </button>
              {viewingReturn.status === 'PENDING' && (
                <button
                  onClick={() => {
                    setViewingReturn(null);
                    setShowApproveModal(viewingReturn);
                    setApproveRefundAmount(String(viewingReturn.refundAmount || viewingReturn.totalValue));
                    setApproveRefundMethod(viewingReturn.refundMethod ?? 'Cash');
                    setFormError('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                  Approve & Restock
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const iCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}