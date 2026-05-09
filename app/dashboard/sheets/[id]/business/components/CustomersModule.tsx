// app/dashboard/sheets/[id]/business/components/CustomersModule.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BusinessConfig, Connection } from '../BusinessApp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  customerType: 'WALK_IN' | 'ONLINE';
  notes: string | null;
  createdAt: string;
}

interface SaleHistory {
  id: string;
  invoiceNumber: string;
  date: string;
  total: number;
  status: string;
  createdAt: string;
}

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  customerType: 'WALK_IN' | 'ONLINE';
  notes: string;
}

const EMPTY_FORM: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  customerType: 'WALK_IN',
  notes: '',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomersModuleProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomersModule({
  connection,
  config,
  fmt,
}: CustomersModuleProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'WALK_IN' | 'ONLINE'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [viewHistory, setViewHistory] = useState<SaleHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/customers`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load customers');
      setCustomers(data.customers ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const fetchHistory = useCallback(
    async (customerId: string) => {
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/user/sheets/${connection.id}/business/customers/${customerId}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to load history');
        setViewHistory(data.history ?? []);
      } catch {
        setViewHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [connection.id]
  );

  const openCreate = () => {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      customerType: customer.customerType,
      notes: customer.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const openView = (customer: Customer) => {
    setViewingCustomer(customer);
    setViewHistory([]);
    fetchHistory(customer.id);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Customer name is required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const isEdit = !!editingCustomer;
      const url = isEdit
        ? `/api/user/sheets/${connection.id}/business/customers/${editingCustomer!.id}`
        : `/api/user/sheets/${connection.id}/business/customers`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          customerType: form.customerType,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save customer');
      setShowForm(false);
      await fetchCustomers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    setDeletingId(customerId);
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/customers/${customerId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      if (viewingCustomer?.id === customerId) setViewingCustomer(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q);
    const matchType =
      typeFilter === 'ALL' || c.customerType === typeFilter;
    return matchSearch && matchType;
  });

  const walkInCount = customers.filter(c => c.customerType === 'WALK_IN').length;
  const onlineCount = customers.filter(c => c.customerType === 'ONLINE').length;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {customers.length} total · {walkInCount} walk-in · {onlineCount} online
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: customers.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Walk-in', value: walkInCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Online', value: onlineCount, color: 'bg-violet-50 text-violet-700 border-violet-200' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border p-4 ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{stat.label} Customers</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['ALL', 'WALK_IN', 'ONLINE'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'WALK_IN' ? '🚶 Walk-in' : '🌐 Online'}
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
            <p className="text-slate-500 text-sm">Loading customers...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl block mb-3">👥</span>
          <p className="text-slate-600 font-medium mb-1">
            {search || typeFilter !== 'ALL'
              ? 'No customers match your filters'
              : 'No customers yet'}
          </p>
          <p className="text-slate-400 text-sm mb-4">
            {search || typeFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Add your first customer to get started'}
          </p>
          {!search && typeFilter === 'ALL' && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Add Customer
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">City</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                          customer.customerType === 'ONLINE'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(customer.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {customer.phone && (
                          <p className="text-slate-600">{customer.phone}</p>
                        )}
                        {customer.email && (
                          <p className="text-slate-400 text-xs truncate max-w-[180px]">
                            {customer.email}
                          </p>
                        )}
                        {!customer.phone && !customer.email && (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                      {customer.city ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        customer.customerType === 'ONLINE'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {customer.customerType === 'ONLINE' ? '🌐 Online' : '🚶 Walk-in'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openView(customer)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View history"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(customer)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          disabled={deletingId === customer.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === customer.id ? (
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

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <FormField label="Customer Name *">
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="John Doe"
                  className={iCls}
                  autoFocus
                />
              </FormField>

              <FormField label="Customer Type">
                <div className="flex gap-3">
                  {(['WALK_IN', 'ONLINE'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, customerType: t }))}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                        form.customerType === t
                          ? t === 'ONLINE'
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {t === 'WALK_IN' ? '🚶 Walk-in' : '🌐 Online'}
                    </button>
                  ))}
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Phone">
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+977-9800000000"
                    className={iCls}
                  />
                </FormField>
                <FormField label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="customer@email.com"
                    className={iCls}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="City">
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="Kathmandu"
                    className={iCls}
                  />
                </FormField>
                <FormField label="Address">
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Street address"
                    className={iCls}
                  />
                </FormField>
              </div>

              <FormField label="Notes">
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                  className={iCls}
                />
              </FormField>
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
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View / History Modal ── */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  viewingCustomer.customerType === 'ONLINE'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {viewingCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {viewingCustomer.name}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    viewingCustomer.customerType === 'ONLINE'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {viewingCustomer.customerType === 'ONLINE' ? '🌐 Online' : '🚶 Walk-in'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Phone', value: viewingCustomer.phone },
                  { label: 'Email', value: viewingCustomer.email },
                  { label: 'City', value: viewingCustomer.city },
                  { label: 'Address', value: viewingCustomer.address },
                  {
                    label: 'Since',
                    value: new Date(viewingCustomer.createdAt).toLocaleDateString(),
                  },
                ]
                  .filter(r => r.value)
                  .map(row => (
                    <div key={row.label} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-0.5">{row.label}</p>
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {row.value}
                      </p>
                    </div>
                  ))}
              </div>

              {viewingCustomer.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{viewingCustomer.notes}</p>
                </div>
              )}

              {/* Purchase History */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  Purchase History
                </h4>
                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : viewHistory.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl">
                    <p className="text-slate-400 text-sm">No purchases yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400">Total Orders</p>
                        <p className="text-lg font-bold text-blue-700">
                          {viewHistory.length}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400">Total Spent</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {fmt(viewHistory.reduce((s, h) => s + h.total, 0))}
                        </p>
                      </div>
                    </div>
                    {viewHistory.map(sale => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {sale.invoiceNumber}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {fmt(sale.total)}
                          </p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            sale.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700'
                              : sale.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {sale.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button
                onClick={() => {
                  setViewingCustomer(null);
                  openEdit(viewingCustomer);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setViewingCustomer(null);
                  handleDelete(viewingCustomer.id);
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