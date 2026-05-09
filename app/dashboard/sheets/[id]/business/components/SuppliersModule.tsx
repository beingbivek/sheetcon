// app/dashboard/sheets/[id]/business/components/SuppliersModule.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BusinessConfig, Connection } from '../BusinessApp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  contactPerson: string | null;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: string;
}

interface SupplierFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  contactPerson: string;
  paymentTerms: string;
  notes: string;
}

const EMPTY_FORM: SupplierFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  contactPerson: '',
  paymentTerms: 'Net 30',
  notes: '',
};

const PAYMENT_TERMS = [
  'Immediate',
  'Net 7',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
  'Custom',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SuppliersModuleProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuppliersModule({
  connection,
  config,
  fmt,
}: SuppliersModuleProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/suppliers`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load suppliers');
      setSuppliers(data.suppliers ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openCreate = () => {
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      city: supplier.city ?? '',
      contactPerson: supplier.contactPerson ?? '',
      paymentTerms: supplier.paymentTerms ?? 'Net 30',
      notes: supplier.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Supplier name is required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const isEdit = !!editingSupplier;
      const url = isEdit
        ? `/api/user/sheets/${connection.id}/business/suppliers/${editingSupplier!.id}`
        : `/api/user/sheets/${connection.id}/business/suppliers`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          contactPerson: form.contactPerson.trim() || null,
          paymentTerms: form.paymentTerms || null,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save supplier');
      setShowForm(false);
      await fetchSuppliers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm('Delete this supplier? This cannot be undone.')) return;
    setDeletingId(supplierId);
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/suppliers/${supplierId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      if (viewingSupplier?.id === supplierId) setViewingSupplier(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.city ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.phone ?? '').includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Suppliers</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}{' '}
            registered
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative">
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
          placeholder="Search suppliers..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
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
            <p className="text-slate-500 text-sm">Loading suppliers...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl block mb-3">🏭</span>
          <p className="text-slate-600 font-medium mb-1">
            {search ? 'No suppliers match your search' : 'No suppliers yet'}
          </p>
          <p className="text-slate-400 text-sm mb-4">
            {search
              ? 'Try a different search term'
              : 'Add your first supplier to get started'}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Add Supplier
            </button>
          )}
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Supplier
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">
                    City
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">
                    Payment Terms
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(supplier => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                          {supplier.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {supplier.name}
                          </p>
                          {supplier.contactPerson && (
                            <p className="text-xs text-slate-400">
                              {supplier.contactPerson}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {supplier.phone && (
                          <p className="text-slate-600">{supplier.phone}</p>
                        )}
                        {supplier.email && (
                          <p className="text-slate-400 text-xs truncate max-w-[180px]">
                            {supplier.email}
                          </p>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                      {supplier.city ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {supplier.paymentTerms ?? 'Not set'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingSupplier(supplier)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(supplier)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          disabled={deletingId === supplier.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === supplier.id ? (
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
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
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

              <FormField label="Supplier Name *">
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="ABC Traders"
                  className={iCls}
                  autoFocus
                />
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
                    placeholder="supplier@email.com"
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
                <FormField label="Contact Person">
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))}
                    placeholder="Ram Sharma"
                    className={iCls}
                  />
                </FormField>
              </div>

              <FormField label="Address">
                <textarea
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Full address..."
                  rows={2}
                  className={iCls}
                />
              </FormField>

              <FormField label="Payment Terms">
                <select
                  value={form.paymentTerms}
                  onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}
                  className={iCls}
                >
                  {PAYMENT_TERMS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Notes">
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
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
                {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {viewingSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                  {viewingSupplier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {viewingSupplier.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID: {viewingSupplier.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSupplier(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-3">
              {[
                { label: 'Phone', value: viewingSupplier.phone },
                { label: 'Email', value: viewingSupplier.email },
                { label: 'Address', value: viewingSupplier.address },
                { label: 'City', value: viewingSupplier.city },
                { label: 'Contact Person', value: viewingSupplier.contactPerson },
                { label: 'Payment Terms', value: viewingSupplier.paymentTerms },
                { label: 'Notes', value: viewingSupplier.notes },
                {
                  label: 'Added On',
                  value: viewingSupplier.createdAt
                    ? new Date(viewingSupplier.createdAt).toLocaleDateString()
                    : null,
                },
              ].map(row => (
                row.value ? (
                  <div key={row.label} className="flex gap-3">
                    <span className="text-sm text-slate-400 w-32 flex-shrink-0">
                      {row.label}
                    </span>
                    <span className="text-sm text-slate-900 font-medium">
                      {row.value}
                    </span>
                  </div>
                ) : null
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setViewingSupplier(null);
                  openEdit(viewingSupplier);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setViewingSupplier(null);
                  handleDelete(viewingSupplier.id);
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