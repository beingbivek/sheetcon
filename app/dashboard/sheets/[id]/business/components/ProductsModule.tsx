// app/dashboard/sheets/[id]/business/components/ProductsModule.tsx

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BusinessConfig, Connection } from '../BusinessApp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string | null;
  supplierId: string | null;
  supplierName: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  description: string;
  costPrice: string;
  sellingPrice: string;
  stock: string;
  minStock: string;
  unit: string;
  supplierId: string;
  supplierName: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductFormData = {
  name: '',
  sku: '',
  category: '',
  description: '',
  costPrice: '',
  sellingPrice: '',
  stock: '0',
  minStock: '5',
  unit: 'pcs',
  supplierId: '',
  supplierName: '',
  imageUrl: '',
};

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'meter', 'cm', 'box', 'pack', 'dozen', 'pair', 'set'];
const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Furniture', 'Stationery', 'Tools', 'Cosmetics', 'Accessories', 'Other'];

type FilterTab = 'all' | 'low-stock' | 'out-of-stock';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductsModuleProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductsModule({
  connection,
  config,
  fmt,
}: ProductsModuleProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  const threshold = parseInt(config.lowStockThreshold || '5');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, supRes] = await Promise.all([
        fetch(`/api/user/sheets/${connection.id}/business/products`),
        fetch(`/api/user/sheets/${connection.id}/business/suppliers`),
      ]);
      const [prodData, supData] = await Promise.all([
        prodRes.json(),
        supRes.json(),
      ]);
      if (!prodRes.ok) throw new Error(prodData.error ?? 'Failed to load products');
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

  const openCreate = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setImagePreview('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku ?? '',
      category: product.category ?? '',
      description: product.description ?? '',
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      stock: String(product.stock),
      minStock: String(product.minStock),
      unit: product.unit ?? 'pcs',
      supplierId: product.supplierId ?? '',
      supplierName: product.supplierName ?? '',
      imageUrl: product.imageUrl ?? '',
    });
    setImagePreview(product.imageUrl ?? '');
    setFormError('');
    setShowForm(true);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be under 5MB');
      return;
    }
    setUploadingImage(true);
    setFormError('');
    try {
      const base64Data = await fileToBase64(file);
      setImagePreview(base64Data);
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'product',
            base64Data,
            referenceId: editingProduct?.id ?? `new_${Date.now()}`,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setImagePreview(data.url);
      setForm(p => ({ ...p, imageUrl: data.url }));
    } catch (err: any) {
      setFormError(err.message);
      setImagePreview(editingProduct?.imageUrl ?? '');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    const found = suppliers.find(s => s.id === supplierId);
    setForm(p => ({
      ...p,
      supplierId,
      supplierName: found?.name ?? '',
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Product name is required');
      return;
    }
    if (!form.sellingPrice || isNaN(parseFloat(form.sellingPrice))) {
      setFormError('Valid selling price is required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const isEdit = !!editingProduct;
      const url = isEdit
        ? `/api/user/sheets/${connection.id}/business/products/${editingProduct!.id}`
        : `/api/user/sheets/${connection.id}/business/products`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          category: form.category || null,
          description: form.description.trim() || null,
          costPrice: parseFloat(form.costPrice) || 0,
          sellingPrice: parseFloat(form.sellingPrice) || 0,
          stock: parseFloat(form.stock) || 0,
          minStock: parseFloat(form.minStock) || 0,
          unit: form.unit || null,
          supplierId: form.supplierId || null,
          supplierName: form.supplierName || null,
          imageUrl: form.imageUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save product');
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeletingId(productId);
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/products/${productId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      setProducts(prev => prev.filter(p => p.id !== productId));
      if (viewingProduct?.id === productId) setViewingProduct(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const categories = Array.from(
    new Set(products.map(p => p.category).filter(Boolean) as string[])
  );

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      (p.category ?? '').toLowerCase().includes(q);
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    const matchTab =
      filterTab === 'all'
        ? true
        : filterTab === 'low-stock'
        ? p.stock > 0 && p.stock <= (p.minStock || threshold)
        : p.stock === 0;
    return matchSearch && matchCategory && matchTab;
  });

  const lowStockCount = products.filter(
    p => p.stock > 0 && p.stock <= (p.minStock || threshold)
  ).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  const stockBadge = (product: Product) => {
    if (product.stock === 0)
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          Out of Stock
        </span>
      );
    if (product.stock <= (product.minStock || threshold))
      return (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
          Low Stock
        </span>
      );
    return (
      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
        In Stock
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {products.length} product{products.length !== 1 ? 's' : ''} ·{' '}
            {lowStockCount > 0 && (
              <span className="text-amber-600 font-medium">
                {lowStockCount} low stock
              </span>
            )}
            {outOfStockCount > 0 && (
              <span className="text-red-600 font-medium ml-1">
                · {outOfStockCount} out of stock
              </span>
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(
          [
            { id: 'all', label: `All (${products.length})` },
            { id: 'low-stock', label: `Low Stock (${lowStockCount})` },
            { id: 'out-of-stock', label: `Out of Stock (${outOfStockCount})` },
          ] as { id: FilterTab; label: string }[]
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Category */}
      <div className="flex gap-3">
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
            placeholder="Search by name, SKU, category..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
            <p className="text-slate-500 text-sm">Loading products...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl block mb-3">📦</span>
          <p className="text-slate-600 font-medium mb-1">
            {search || categoryFilter || filterTab !== 'all'
              ? 'No products match your filters'
              : 'No products yet'}
          </p>
          <p className="text-slate-400 text-sm mb-4">
            {search || categoryFilter || filterTab !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first product to get started'}
          </p>
          {!search && !categoryFilter && filterTab === 'all' && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Add Product
            </button>
          )}
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
                <div className="absolute top-2 right-2">
                  {stockBadge(product)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">
                    {product.name}
                  </p>
                </div>
                {product.sku && (
                  <p className="text-xs text-slate-400 mb-2">
                    SKU: {product.sku}
                  </p>
                )}
                {product.category && (
                  <span className="inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full mb-2">
                    {product.category}
                  </span>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-xs text-slate-400">Selling Price</p>
                    <p className="font-bold text-slate-900 text-sm">
                      {fmt(product.sellingPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Stock</p>
                    <p
                      className={`font-semibold text-sm ${
                        product.stock === 0
                          ? 'text-red-600'
                          : product.stock <= (product.minStock || threshold)
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {product.stock} {product.unit ?? 'pcs'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setViewingProduct(product)}
                    className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openEdit(product)}
                    className="flex-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deletingId === product.id}
                    className="py-1.5 px-2 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === product.id ? '...' : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add Product'}
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

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">📦</span>
                    )}
                  </div>
                  <div>
                    <input
                      ref={imageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <button
                      onClick={() => imageRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </button>
                    {imagePreview && (
                      <button
                        onClick={() => {
                          setImagePreview('');
                          setForm(p => ({ ...p, imageUrl: '' }));
                        }}
                        className="block text-xs text-red-500 hover:underline mt-1"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      JPG, PNG, WebP · Max 5MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Product Name *">
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Product name"
                    className={iCls}
                    autoFocus
                  />
                </FormField>
                <FormField label="SKU">
                  <input
                    type="text"
                    value={form.sku}
                    onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                    placeholder="SKU-001"
                    className={iCls}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Category">
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className={iCls}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {categories
                      .filter(c => !CATEGORIES.includes(c))
                      .map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                </FormField>
                <FormField label="Unit">
                  <select
                    value={form.unit}
                    onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    className={iCls}
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={`Cost Price (${config.currencySymbol})`}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.costPrice}
                    onChange={e => setForm(p => ({ ...p, costPrice: e.target.value }))}
                    placeholder="0.00"
                    className={iCls}
                  />
                </FormField>
                <FormField label={`Selling Price (${config.currencySymbol}) *`}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={e => setForm(p => ({ ...p, sellingPrice: e.target.value }))}
                    placeholder="0.00"
                    className={iCls}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Current Stock">
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                    placeholder="0"
                    className={iCls}
                  />
                </FormField>
                <FormField label="Min Stock (Alert threshold)">
                  <input
                    type="number"
                    min={0}
                    value={form.minStock}
                    onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))}
                    placeholder="5"
                    className={iCls}
                  />
                </FormField>
              </div>

              <FormField label="Supplier">
                <select
                  value={form.supplierId}
                  onChange={e => handleSupplierChange(e.target.value)}
                  className={iCls}
                >
                  <option value="">No supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Description">
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Product description..."
                  rows={3}
                  className={iCls}
                />
              </FormField>

              {/* Margin preview */}
              {form.costPrice && form.sellingPrice && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Margin Preview
                  </p>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-slate-400">Profit</p>
                      <p className="font-semibold text-emerald-700 text-sm">
                        {fmt(
                          parseFloat(form.sellingPrice || '0') -
                            parseFloat(form.costPrice || '0')
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Margin %</p>
                      <p className="font-semibold text-blue-700 text-sm">
                        {parseFloat(form.sellingPrice || '0') > 0
                          ? (
                              ((parseFloat(form.sellingPrice || '0') -
                                parseFloat(form.costPrice || '0')) /
                                parseFloat(form.sellingPrice || '0')) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                disabled={saving || uploadingImage}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0">
              {viewingProduct.imageUrl ? (
                <div className="h-52 overflow-hidden rounded-t-2xl">
                  <img
                    src={viewingProduct.imageUrl}
                    alt={viewingProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-32 bg-slate-100 rounded-t-2xl flex items-center justify-center">
                  <span className="text-5xl">📦</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {viewingProduct.name}
                    </h3>
                    {viewingProduct.sku && (
                      <p className="text-sm text-slate-400">
                        SKU: {viewingProduct.sku}
                      </p>
                    )}
                  </div>
                  {stockBadge(viewingProduct)}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Cost Price</p>
                    <p className="font-bold text-slate-900">
                      {fmt(viewingProduct.costPrice)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Selling Price</p>
                    <p className="font-bold text-emerald-700">
                      {fmt(viewingProduct.sellingPrice)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Stock</p>
                    <p
                      className={`font-bold ${
                        viewingProduct.stock === 0
                          ? 'text-red-700'
                          : viewingProduct.stock <= (viewingProduct.minStock || threshold)
                          ? 'text-amber-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {viewingProduct.stock} {viewingProduct.unit}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Min Stock Alert</p>
                    <p className="font-bold text-slate-900">
                      {viewingProduct.minStock} {viewingProduct.unit}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {viewingProduct.category && (
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-28">Category</span>
                      <span className="text-slate-900 font-medium">
                        {viewingProduct.category}
                      </span>
                    </div>
                  )}
                  {viewingProduct.supplierName && (
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-28">Supplier</span>
                      <span className="text-slate-900 font-medium">
                        {viewingProduct.supplierName}
                      </span>
                    </div>
                  )}
                  {viewingProduct.description && (
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-28">Description</span>
                      <span className="text-slate-900">
                        {viewingProduct.description}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-28">Margin</span>
                    <span className="text-emerald-700 font-medium">
                      {fmt(
                        viewingProduct.sellingPrice - viewingProduct.costPrice
                      )}{' '}
                      (
                      {viewingProduct.sellingPrice > 0
                        ? (
                            ((viewingProduct.sellingPrice -
                              viewingProduct.costPrice) /
                              viewingProduct.sellingPrice) *
                            100
                          ).toFixed(1)
                        : '0.0'}
                      %)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingProduct(null);
                  openEdit(viewingProduct);
                }}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Edit Product
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