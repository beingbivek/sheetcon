// app/dashboard/sheets/[id]/business/components/ProductsModule.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import type { BusinessConfig, Connection } from "../BusinessApp";

// ── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  variation: string | null;
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
  pricedWithTax: boolean;   // ← TASK 4
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  name: string;
}

type FilterTab = "all" | "low" | "out";

interface FormData {
  name: string;
  variation: string;
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
  pricedWithTax: boolean;   // ← TASK 4
}

const EMPTY_FORM: FormData = {
  name: "",
  variation: "",
  sku: "",
  category: "",
  description: "",
  costPrice: "",
  sellingPrice: "",
  stock: "0",
  minStock: "5",
  unit: "",
  supplierId: "",
  supplierName: "",
  imageUrl: "",
  pricedWithTax: false,     // ← TASK 4
};

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductsModule({ connection, config, fmt }: Props) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Filters
  const [search, setSearch]       = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [showForm, setShowForm]   = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Form
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/user/sheets/${connection.id}/business/products`),
        fetch(`/api/user/sheets/${connection.id}/business/suppliers`),
      ]);
      const [pData, sData] = await Promise.all([pRes.json(), sRes.json()]);
      if (!pRes.ok) throw new Error(pData.error ?? "Failed to load products");
      setProducts(pData.products ?? []);
      setSuppliers(sData.suppliers ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [connection.id]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean) as string[]),
  ).sort();

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.variation ?? "").toLowerCase().includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q);
    const matchesCat = !categoryFilter || p.category === categoryFilter;
    const matchesTab =
      filterTab === "all"
        ? true
        : filterTab === "low"
          ? p.stock > 0 && p.stock <= p.minStock
          : p.stock === 0;
    return matchesSearch && matchesCat && matchesTab;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      variation: p.variation ?? "",
      sku: p.sku ?? "",
      category: p.category ?? "",
      description: p.description ?? "",
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
      unit: p.unit ?? "",
      supplierId: p.supplierId ?? "",
      supplierName: p.supplierName ?? "",
      imageUrl: p.imageUrl ?? "",
      pricedWithTax: p.pricedWithTax,   // ← TASK 4
    });
    setFormError(null);
    setShowForm(true);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const base64Data = await fileToBase64(file);
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product",
            base64Data,
            referenceId: `product_${Date.now()}`,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.sellingPrice) { setFormError("Selling price is required"); return; }
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      variation: form.variation.trim() || null,
      sku: form.sku.trim() || null,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      stock: parseFloat(form.stock) || 0,
      minStock: parseFloat(form.minStock) || 0,
      unit: form.unit.trim() || null,
      supplierId: form.supplierId || null,
      supplierName: form.supplierName || null,
      imageUrl: form.imageUrl || null,
      pricedWithTax: form.pricedWithTax,   // ← TASK 4
    };

    try {
      const url = editProduct
        ? `/api/user/sheets/${connection.id}/business/products/${editProduct.id}`
        : `/api/user/sheets/${connection.id}/business/products`;
      const res = await fetch(url, {
        method: editProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      await fetchData();
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/products/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Delete failed");
      await fetchData();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    const sup = suppliers.find((s) => s.id === supplierId);
    setForm((f) => ({
      ...f,
      supplierId,
      supplierName: sup?.name ?? "",
    }));
  };

  // ── Margin calc ────────────────────────────────────────────────────────────

  const getMargin = (cost: number, sell: number) => {
    if (sell <= 0) return { profit: 0, pct: 0 };
    const profit = sell - cost;
    return { profit, pct: (profit / sell) * 100 };
  };

  // ── Stock badge ────────────────────────────────────────────────────────────

  const stockBadge = (p: Product) => {
    if (p.stock === 0)
      return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Out of Stock</span>;
    if (p.stock <= p.minStock && p.minStock > 0)
      return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Low Stock</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">In Stock</span>;
  };

  // ── Tax pricing badge ──────────────────────────────────────────────────────

  const taxBadge = (pricedWithTax: boolean) =>
    pricedWithTax ? (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
        Tax Incl.
      </span>
    ) : (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
        Tax Excl.
      </span>
    );

  // ── Counts ─────────────────────────────────────────────────────────────────

  const lowCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock && p.minStock > 0).length;
  const outCount = products.filter((p) => p.stock === 0).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-3">⏳</div>
          <p className="text-slate-500">Loading products…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-red-600 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Products</h2>
          <p className="text-sm text-slate-500">{products.length} products total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>+</span> Add Product
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(
          [
            { id: "all", label: `All (${products.length})` },
            { id: "low", label: `Low Stock (${lowCount})` },
            { id: "out", label: `Out of Stock (${outCount})` },
          ] as { id: FilterTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterTab === t.id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search & category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, SKU, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting filters or add a new product</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const margin = getMargin(p.costPrice, p.sellingPrice);
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Image */}
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-36 object-cover"
                  />
                ) : (
                  <div className="w-full h-36 bg-slate-100 flex items-center justify-center text-4xl">
                    🏷️
                  </div>
                )}

                <div className="p-3 space-y-2">
                  {/* Name + stock badge */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">
                      {p.name}
                    </h3>
                    {stockBadge(p)}
                  </div>

                  {/* Category + Variation + SKU */}
                  {(p.category || p.variation || p.sku) && (
                    <p className="text-xs text-slate-400">
                      {[p.category, p.variation, p.sku ? `#${p.sku}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  {/* Price + tax badge */}
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-slate-800">
                      {fmt(p.sellingPrice)}
                    </p>
                    {taxBadge(p.pricedWithTax)}  {/* ← TASK 4 */}
                  </div>

                  {/* Stock */}
                  <p className="text-xs text-slate-500">
                    Stock: <span className="font-medium text-slate-700">{p.stock} {p.unit ?? "pcs"}</span>
                  </p>

                  {/* Margin */}
                  <p className="text-xs text-slate-500">
                    Margin:{" "}
                    <span className={`font-medium ${margin.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {fmt(margin.profit)} ({margin.pct.toFixed(1)}%)
                    </span>
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setViewProduct(p)}
                      className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 py-1.5 text-xs border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="py-1.5 px-2 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto py-8 px-4">
          <div className="mx-auto bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-base font-semibold text-slate-800">
                {editProduct ? "Edit Product" : "Add Product"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-3xl">
                      🏷️
                    </div>
                  )}
                  <div className="space-y-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      {uploading ? "Uploading…" : "Upload Image"}
                    </button>
                    {form.imageUrl && (
                      <button
                        onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                        className="block text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </div>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Basmati Rice 5kg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Variation</label>
                  <input
                    type="text"
                    value={form.variation}
                    onChange={(e) => setForm((f) => ({ ...f, variation: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 1kg, Red, XL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. RICE-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    list="categories-list"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Groceries"
                  />
                  <datalist id="categories-list">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="pcs / kg / ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">No supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Pricing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cost Price ({config.currencySymbol || "Rs."})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.costPrice}
                      onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Selling Price ({config.currencySymbol || "Rs."}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sellingPrice}
                      onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* ── TASK 4: Tax pricing toggle ─────────────────────────── */}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    How is this selling price set?
                  </label>
                  <div className="flex rounded-lg border border-slate-300 overflow-hidden w-fit">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, pricedWithTax: false }))}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        !form.pricedWithTax
                          ? "bg-slate-700 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Excludes Tax
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, pricedWithTax: true }))}
                      className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-300 ${
                        form.pricedWithTax
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Includes Tax
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {form.pricedWithTax
                      ? "Tax is already baked into the selling price. At billing, tax will be back-calculated."
                      : "Tax will be added on top of this price at billing time."}
                  </p>
                </div>

                {/* Margin preview */}
                {form.costPrice && form.sellingPrice && (
                  <div className="mt-3 bg-slate-50 rounded-lg p-3">
                    {(() => {
                      const m = getMargin(
                        parseFloat(form.costPrice) || 0,
                        parseFloat(form.sellingPrice) || 0,
                      );
                      return (
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-slate-500">Profit:</span>{" "}
                            <span className={`font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {fmt(m.profit)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Margin:</span>{" "}
                            <span className={`font-semibold ${m.pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {m.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Min Stock (alert)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStock}
                    onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Optional product notes…"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : editProduct ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      {viewProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-800">Product Details</h3>
              <button
                onClick={() => setViewProduct(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              {viewProduct.imageUrl && (
                <img
                  src={viewProduct.imageUrl}
                  alt={viewProduct.name}
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: "Name",          value: viewProduct.name },
                  { label: "Variation",    value: viewProduct.variation ?? "—" },
                  { label: "SKU",           value: viewProduct.sku ?? "—" },
                  { label: "Category",      value: viewProduct.category ?? "—" },
                  { label: "Unit",          value: viewProduct.unit ?? "—" },
                  { label: "Cost Price",    value: fmt(viewProduct.costPrice) },
                  { label: "Selling Price", value: fmt(viewProduct.sellingPrice) },
                  // ── TASK 4: tax pricing row ──
                  {
                    label: "Tax Pricing",
                    value: viewProduct.pricedWithTax ? "Includes tax" : "Excludes tax",
                  },
                  { label: "Stock",         value: `${viewProduct.stock} ${viewProduct.unit ?? "pcs"}` },
                  { label: "Min Stock",     value: String(viewProduct.minStock) },
                  { label: "Supplier",      value: viewProduct.supplierName ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-slate-400 text-xs">{label}</p>
                    <p className="font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              {viewProduct.description && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">Description</p>
                  <p className="text-sm text-slate-700">{viewProduct.description}</p>
                </div>
              )}
              {/* Margin */}
              <div className="bg-slate-50 rounded-lg p-3">
                {(() => {
                  const m = getMargin(viewProduct.costPrice, viewProduct.sellingPrice);
                  return (
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-slate-500">Profit:</span>{" "}
                        <span className={`font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {fmt(m.profit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Margin:</span>{" "}
                        <span className={`font-semibold ${m.pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {m.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200">
              <button
                onClick={() => { setViewProduct(null); openEdit(viewProduct); }}
                className="flex-1 py-2 text-sm font-medium border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Edit Product
              </button>
              <button
                onClick={() => setViewProduct(null)}
                className="flex-1 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-base font-semibold text-slate-800 mb-2">
              Delete &quot;{deleteTarget.name}&quot;?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              This cannot be undone. Stock records linked to this product may be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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