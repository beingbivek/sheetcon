'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BusinessConfig, Connection } from '../BusinessApp';
import BillPrint from './BillPrint';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  sellingPrice: number;
  stock: number;
  unit: string | null;
  imageUrl: string | null;
  pricedWithTax: boolean; // Task 4
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  customerType: 'WALK_IN' | 'ONLINE';
}

interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
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
  customerId: string | null;
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
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  notes: string | null;
  createdAt: string;
  items?: SaleItem[];
}

interface CartEntry {
  productId: string;
  productName: string;
  variation: string;
  quantity: number;
  unitPrice: number;     // always the stored sellingPrice
  pricedWithTax: boolean;
  total: number;
  maxStock: number;
  imageUrl: string | null;
}

type ViewMode = 'pos' | 'history';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalesModuleProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a cart and tax rate, compute:
 *   subtotal      — sum of item totals (pre-tax basis)
 *   taxAmount     — tax on the after-discount subtotal
 *   grandTotal
 *
 * If a cart item is pricedWithTax=true, its sellingPrice already contains the
 * tax portion. We back-calculate the ex-tax price for the subtotal display,
 * then re-add tax at the bill level (so the line-item total shown equals the
 * tax-inclusive price × qty, but the tax row shows the extracted amount).
 *
 * If pricedWithTax=false, tax is added on top as normal.
 */
function computeTotals(
  cart: CartEntry[],
  discountType: 'PERCENT' | 'FIXED',
  discountValue: number,
  taxPercent: number,
  deliveryFee: number,
) {
  // For display, subtotal is always sum of item.total (which uses stored price)
  const rawSubtotal = cart.reduce((s, i) => s + i.total, 0);

  const discAmt =
    discountType === 'PERCENT'
      ? (rawSubtotal * discountValue) / 100
      : discountValue;
  const afterDiscount = Math.max(0, rawSubtotal - discAmt);

  // Split cart into tax-inclusive vs tax-exclusive items
  // For tax-inclusive items: embedded tax = price - price/(1 + rate/100)
  // For tax-exclusive items: tax added on top of afterDiscount proportion
  let embeddedTax = 0;
  let exclusiveBase = 0;

  const totalRaw = cart.reduce((s, i) => s + i.total, 0) || 1;
  const discountRatio = afterDiscount / totalRaw; // scale down for discount

  for (const item of cart) {
    const discountedTotal = item.total * discountRatio;
    if (item.pricedWithTax && taxPercent > 0) {
      // back-calculate embedded tax
      embeddedTax += discountedTotal - discountedTotal / (1 + taxPercent / 100);
    } else {
      exclusiveBase += discountedTotal;
    }
  }

  const addOnTax = (exclusiveBase * taxPercent) / 100;
  const taxAmount = embeddedTax + addOnTax;

  // delivery fee is always added after discounts and tax
  const grandTotal = afterDiscount + addOnTax + deliveryFee;

  return { rawSubtotal, discAmt, afterDiscount, taxAmount, grandTotal };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesModule({ connection, config, fmt }: SalesModuleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // POS state
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('0');
  // Task 5: taxPercent initialised from config.defaultTaxRate
  const [taxPercent, setTaxPercent] = useState(config.defaultTaxRate ?? '0');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [saleType, setSaleType] = useState<'WALK_IN' | 'ONLINE'>('WALK_IN');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [posError, setPosError] = useState('');

  // Task 3: phone autocomplete
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneDropdown, setPhoneDropdown] = useState<Customer[]>([]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  const [showCheckout, setShowCheckout] = useState(false);
  const [printingSale, setPrintingSale] = useState<Sale | null>(null);

  // History
  const [historySearch, setHistorySearch] = useState('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync taxPercent when config changes (e.g. user updates settings mid-session)
  useEffect(() => {
    setTaxPercent(config.defaultTaxRate ?? '0');
  }, [config.defaultTaxRate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, custRes, salesRes] = await Promise.all([
        fetch(`/api/user/sheets/${connection.id}/business/products`),
        fetch(`/api/user/sheets/${connection.id}/business/customers`),
        fetch(`/api/user/sheets/${connection.id}/business/sales`),
      ]);
      const [prodData, custData, salesData] = await Promise.all([
        prodRes.json(), custRes.json(), salesRes.json(),
      ]);
      if (!prodRes.ok) throw new Error(prodData.error ?? 'Failed to load');
      setProducts(prodData.products ?? []);
      setCustomers(custData.customers ?? []);
      setSales(salesData.sales ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close phone dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (phoneRef.current && !phoneRef.current.contains(e.target as Node)) {
        setShowPhoneDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Task 3: phone autocomplete logic ────────────────────────────────────

  const handlePhoneInput = (val: string) => {
    setPhoneInput(val);
    // Clear customer selection if user clears the field
    if (!val.trim()) {
      setSelectedCustomerId('');
      setSelectedCustomerName('');
      setShowPhoneDropdown(false);
      setPhoneDropdown([]);
      return;
    }
    const q = val.toLowerCase();
    const matches = customers.filter(
      c =>
        (c.phone ?? '').toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    );
    setPhoneDropdown(matches.slice(0, 6));
    setShowPhoneDropdown(matches.length > 0);
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setSelectedCustomerName(c.name);
    setPhoneInput(c.phone ?? c.name);
    setCustomerAddress(c.address ?? '');
    setShowPhoneDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setPhoneInput('');
    setCustomerAddress('');
    setPhoneDropdown([]);
    setShowPhoneDropdown(false);
  };

  // ─── Cart Logic ───────────────────────────────────────────────────────────

  const addToCart = (product: Product) => {
    const existing = cart.findIndex(
      c => c.productId === product.id && c.variation === '',
    );
    if (existing !== -1) {
      const updated = [...cart];
      const item = updated[existing];
      if (item.quantity >= product.stock) {
        setPosError(`Cannot add more. Only ${product.stock} in stock.`);
        setTimeout(() => setPosError(''), 3000);
        return;
      }
      item.quantity += 1;
      item.total = item.quantity * item.unitPrice;
      setCart(updated);
    } else {
      if (product.stock <= 0) {
        setPosError(`${product.name} is out of stock`);
        setTimeout(() => setPosError(''), 3000);
        return;
      }
      setCart(prev => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          variation: '',
          quantity: 1,
          unitPrice: product.sellingPrice,
          pricedWithTax: product.pricedWithTax,
          total: product.sellingPrice,
          maxStock: product.stock,
          imageUrl: product.imageUrl,
        },
      ]);
    }
  };

  const updateCartQty = (idx: number, qty: number) => {
    const updated = [...cart];
    const item = updated[idx];
    if (qty <= 0) {
      updated.splice(idx, 1);
    } else if (qty > item.maxStock) {
      setPosError(`Max stock: ${item.maxStock}`);
      setTimeout(() => setPosError(''), 3000);
      return;
    } else {
      item.quantity = qty;
      item.total = qty * item.unitPrice;
    }
    setCart(updated);
  };

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    setCart([]);
    clearCustomer();
    setSaleType('WALK_IN');
    setCustomerAddress('');
    setDiscountValue('0');
    setTaxPercent(config.defaultTaxRate ?? '0');
    setDeliveryFee('0');
    setAmountPaid('');
    setNotes('');
    setPosError('');
  };

  // ─── Totals (Task 5) ──────────────────────────────────────────────────────

  const { rawSubtotal, discAmt, afterDiscount, taxAmount, grandTotal } =
    computeTotals(
      cart,
      discountType,
      parseFloat(discountValue) || 0,
      parseFloat(taxPercent) || 0,
      parseFloat(deliveryFee) || 0,
    );

  const paid = parseFloat(amountPaid) || 0;
  const due = grandTotal - paid;

  // ─── Checkout ─────────────────────────────────────────────────────────────

  const handleCheckout = async () => {
    if (cart.length === 0) { setPosError('Add items to cart first'); return; }
    if (saleType === 'ONLINE' && !phoneInput.trim()) {
      setPosError('Customer phone is required for online orders');
      setSaving(false);
      return;
    }
    if (saleType === 'ONLINE' && !customerAddress.trim()) {
      setPosError('Customer address is required for online orders');
      setSaving(false);
      return;
    }

    setSaving(true);
    setPosError('');
    try {
      const payStatus: 'PAID' | 'PARTIAL' | 'UNPAID' =
        paid >= grandTotal ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/sales`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: new Date().toISOString(),
            saleType,
            customerId: selectedCustomerId || null,
            customerName: selectedCustomerName || (saleType === 'ONLINE' ? phoneInput.trim() || null : null),
            customerPhone: saleType === 'ONLINE' ? phoneInput.trim() || null : null,
            customerAddress: saleType === 'ONLINE' ? customerAddress.trim() || null : null,
            subtotal: rawSubtotal,
            discountType: parseFloat(discountValue) > 0 ? discountType : null,
            discountValue: parseFloat(discountValue) || 0,
            discountAmount: discAmt,
            taxPercent: parseFloat(taxPercent) || 0,
            taxAmount,
            deliveryFee: parseFloat(deliveryFee) || 0,
            total: grandTotal,
            amountPaid: paid || grandTotal,
            amountDue: Math.max(0, due),
            paymentMethod,
            status: payStatus,
            notes: notes.trim() || null,
            items: cart.map(c => ({
              productId: c.productId,
              productName: c.productName,
              variation: c.variation || null,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              total: c.total,
            })),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create sale');
      if (data.type === 'sale') {
        setPrintingSale(data.sale);
      }
      setShowCheckout(false);
      clearCart();
      await fetchData();
    } catch (err: any) {
      setPosError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── History ──────────────────────────────────────────────────────────────

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Delete this sale? Stock will be restored. This cannot be undone.'))
      return;
    setDeletingId(saleId);
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/sales/${saleId}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      setSales(prev => prev.filter(s => s.id !== saleId));
      if (viewingSale?.id === saleId) setViewingSale(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      (p.category ?? '').toLowerCase().includes(q)
    );
  });

  const filteredSales = sales
    .filter(s => {
      const q = historySearch.toLowerCase();
      return (
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName ?? '').toLowerCase().includes(q)
      );
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  // ─── Loading / Print ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading POS...</p>
        </div>
      </div>
    );
  }

  if (printingSale) {
    return (
      <BillPrint
        sale={printingSale}
        config={config}
        fmt={fmt}
        onClose={() => setPrintingSale(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mode Toggle */}
      <div className="px-4 sm:px-6 pt-4 flex-shrink-0">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setViewMode('pos')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'pos'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🧾 Point of Sale
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📋 Sales History ({sales.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* ════════════════ POS VIEW ════════════════ */}
      {viewMode === 'pos' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Product Grid */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:px-6">
            <div className="relative mb-3 flex-shrink-0">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
              </svg>
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  {productSearch ? 'No products match your search' : 'No products available'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className={`bg-white rounded-xl border p-3 text-left transition-all group ${
                        product.stock <= 0
                          ? 'border-slate-200 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-blue-400 hover:shadow-md active:scale-[0.98]'
                      }`}
                    >
                      <div className="h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden mb-2">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name}
                            className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">📦</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400 mb-1">
                        {product.stock} {product.unit ?? 'pcs'} left
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-blue-700">{fmt(product.sellingPrice)}</p>
                        {product.pricedWithTax && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                            incl. tax
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-slate-900 text-sm">
                Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})
              </h3>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-500 hover:underline">
                  Clear all
                </button>
              )}
            </div>

            {posError && (
              <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                {posError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="text-4xl block mb-2">🛒</span>
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs mt-1">Click a product to add</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div key={`${item.productId}-${item.variation}-${idx}`}
                      className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {item.productName}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-slate-400">{fmt(item.unitPrice)} each</p>
                            {item.pricedWithTax && (
                              <span className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded">
                                tax incl.
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(idx)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCartQty(idx, item.quantity - 1)}
                            className="w-7 h-7 bg-white border border-slate-300 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50">
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-slate-900">
                            {item.quantity}
                          </span>
                          <button onClick={() => updateCartQty(idx, item.quantity + 1)}
                            className="w-7 h-7 bg-white border border-slate-300 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50">
                            +
                          </button>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{fmt(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 flex-shrink-0 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-900">{fmt(rawSubtotal)}</span>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Checkout · {fmt(rawSubtotal)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ HISTORY VIEW ════════════════ */}
      {viewMode === 'history' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
            <input type="text" value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Search sales..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {filteredSales.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-5xl block mb-3">🧾</span>
              <p className="text-slate-600 font-medium mb-1">No sales found</p>
              <p className="text-slate-400 text-sm">
                {historySearch ? 'Try a different search' : 'Create your first sale from the POS'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Invoice</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Customer</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Date</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Total</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{sale.invoiceNumber}</p>
                          <p className="text-xs text-slate-400">{sale.items?.length ?? 0} items</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                          {sale.customerName ?? 'Walk-in'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                          {new Date(sale.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {fmt(sale.total)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            sale.status === 'PAID' ? 'bg-emerald-100 text-emerald-700'
                            : sale.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setViewingSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button onClick={() => setPrintingSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Print">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteSale(sale.id)}
                              disabled={deletingId === sale.id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete">
                              {deletingId === sale.id ? (
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
        </div>
      )}

      {/* ════════════════ CHECKOUT MODAL ════════════════ */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Checkout</h3>
              <button onClick={() => setShowCheckout(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {posError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {posError}
                </div>
              )}

              {/* ── Task 3: Phone-based customer lookup ── */}
              <FormField label="Customer (search by phone or name)">
                <div ref={phoneRef} className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input
                        type="text"
                        value={phoneInput}
                        onChange={e => handlePhoneInput(e.target.value)}
                        onFocus={() => phoneInput && setShowPhoneDropdown(phoneDropdown.length > 0)}
                        placeholder="Phone number or customer name…"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    {selectedCustomerId && (
                      <button onClick={clearCustomer}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Clear customer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Selected customer chip */}
                  {selectedCustomerId && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-blue-600">👤</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 truncate">
                          {selectedCustomerName}
                        </p>
                        <p className="text-xs text-blue-600">{phoneInput}</p>
                      </div>
                      <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    </div>
                  )}

                  {/* Dropdown */}
                  {showPhoneDropdown && phoneDropdown.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                      {phoneDropdown.map(c => (
                        <button
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            c.customerType === 'ONLINE'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{c.name}</p>
                            <p className="text-xs text-slate-400">
                              {c.phone ?? 'No phone'}
                              {c.city ? ` · ${c.city}` : ''}
                            </p>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            c.customerType === 'ONLINE'
                              ? 'bg-violet-100 text-violet-600'
                              : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {c.customerType === 'ONLINE' ? '🌐' : '🚶'}
                          </span>
                        </button>
                      ))}
                      {/* Allow manual / walk-in */}
                      <button
                        onClick={() => {
                          setSelectedCustomerName(phoneInput);
                          setShowPhoneDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left text-sm text-slate-500 italic"
                      >
                        + Use "{phoneInput}" as walk-in name
                      </button>
                    </div>
                  )}

                  {/* No match: allow manual entry */}
                  {phoneInput && !selectedCustomerId && !showPhoneDropdown && phoneDropdown.length === 0 && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      No customer found.{' '}
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => setSelectedCustomerName(phoneInput)}
                      >
                        Use as walk-in name
                      </button>
                    </p>
                  )}
                </div>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Order Type">
                  <select
                    value={saleType}
                    onChange={e => setSaleType(e.target.value as 'WALK_IN' | 'ONLINE')}
                    className={iCls}
                  >
                    <option value="WALK_IN">Walk-in</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </FormField>
                <FormField label="Customer Address">
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder={saleType === 'ONLINE'
                      ? 'Enter delivery address for online order'
                      : 'Optional address'}
                    className={iCls}
                  />
                </FormField>
              </div>

              {saleType === 'ONLINE' && (
                <p className="text-xs text-slate-500">
                  Online orders require a phone number and delivery address. If the customer is already registered, choose them from the lookup.
                </p>
              )}

              {/* Order summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700 mb-2">Order Summary</p>
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {item.productName} × {item.quantity}
                      {item.pricedWithTax && (
                        <span className="ml-1 text-xs text-blue-500">(tax incl.)</span>
                      )}
                    </span>
                    <span className="font-medium text-slate-900">{fmt(item.total)}</span>
                  </div>
                ))}
              </div>

              {/* Discount */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Discount Type">
                  <select value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className={iCls}>
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ({config.currencySymbol})</option>
                  </select>
                </FormField>
                <FormField label={discountType === 'PERCENT' ? 'Discount %' : `Discount (${config.currencySymbol})`}>
                  <input type="number" min={0} step="0.01" value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder="0" className={iCls} />
                </FormField>
              </div>

              {/* ── Task 5: Tax with override ── */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Tax %">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={taxPercent}
                      onChange={e => setTaxPercent(e.target.value)}
                      placeholder="0"
                      className={iCls}
                    />
                    {config.defaultTaxRate && parseFloat(config.defaultTaxRate) > 0 && (
                      <button
                        onClick={() => setTaxPercent(config.defaultTaxRate ?? '0')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:underline"
                        title="Reset to default"
                      >
                        Reset ({config.defaultTaxRate}%)
                      </button>
                    )}
                  </div>
                  {cart.some(i => i.pricedWithTax) && (
                    <p className="text-xs text-blue-600 mt-1">
                      ℹ️ Some items are priced tax-inclusive — tax is back-calculated for those items.
                    </p>
                  )}
                </FormField>
                <FormField label={`Delivery Fee (${config.currencySymbol})`}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={deliveryFee}
                    onChange={e => setDeliveryFee(e.target.value)}
                    placeholder="0"
                    className={iCls}
                  />
                </FormField>
              </div>

              {/* Totals */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span>{fmt(rawSubtotal)}</span>
                </div>
                {discAmt > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>Discount</span><span>-{fmt(discAmt)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Tax ({taxPercent}%
                      {cart.some(i => i.pricedWithTax) && cart.some(i => !i.pricedWithTax)
                        ? ' · mixed'
                        : cart.every(i => i.pricedWithTax)
                        ? ' · extracted'
                        : ''})
                    </span>
                    <span>{fmt(taxAmount)}</span>
                  </div>
                )}
                {parseFloat(deliveryFee) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Delivery Fee</span>
                    <span>{fmt(parseFloat(deliveryFee) || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-blue-200">
                  <span className="text-blue-900">Total</span>
                  <span className="text-blue-900">{fmt(grandTotal)}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Payment Method">
                  <select value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)} className={iCls}>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="eSewa">eSewa</option>
                    <option value="Khalti">Khalti</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </FormField>
                <FormField label={`Amount Received (${config.currencySymbol})`}>
                  <input type="number" min={0} step="0.01" value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    placeholder={grandTotal.toFixed(2)} className={iCls} />
                </FormField>
              </div>

              {paid > 0 && paid < grandTotal && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-amber-700 font-medium">Amount Due</span>
                  <span className="text-amber-700 font-bold">{fmt(Math.max(0, due))}</span>
                </div>
              )}
              {paid > grandTotal && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-emerald-700 font-medium">Change</span>
                  <span className="text-emerald-700 font-bold">{fmt(paid - grandTotal)}</span>
                </div>
              )}

              {config.paymentQrUrl && (
                <div className="text-center bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Scan to Pay</p>
                  <img src={config.paymentQrUrl} alt="Payment QR"
                    className="w-40 h-40 mx-auto object-contain border border-slate-200 rounded-xl bg-white p-1" />
                </div>
              )}

              <FormField label="Notes (optional)">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Additional notes..." rows={2} className={iCls} />
              </FormField>
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button onClick={() => setShowCheckout(false)} disabled={saving}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50">
                Back
              </button>
              <button onClick={handleCheckout} disabled={saving}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {saving ? 'Processing...' : `Complete Sale · ${fmt(grandTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ VIEW SALE MODAL ════════════════ */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingSale.invoiceNumber}</h3>
                <p className="text-xs text-slate-400">{new Date(viewingSale.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  viewingSale.status === 'PAID' ? 'bg-emerald-100 text-emerald-700'
                  : viewingSale.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
                }`}>
                  {viewingSale.status}
                </span>
                <button onClick={() => setViewingSale(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {viewingSale.customerName && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Customer</p>
                  <p className="font-medium text-slate-900">{viewingSale.customerName}</p>
                </div>
              )}

              {viewingSale.items && viewingSale.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Items</p>
                  <div className="space-y-2">
                    {viewingSale.items.map(item => (
                      <div key={item.id}
                        className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                          {item.variation && (
                            <p className="text-xs text-slate-400">{item.variation}</p>
                          )}
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

              <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span><span>{fmt(viewingSale.subtotal)}</span>
                </div>
                {viewingSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span><span>-{fmt(viewingSale.discountAmount)}</span>
                  </div>
                )}
                {viewingSale.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax ({viewingSale.taxPercent}%)</span>
                    <span>{fmt(viewingSale.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-blue-200">
                  <span className="text-blue-900">Total</span>
                  <span className="text-blue-900">{fmt(viewingSale.total)}</span>
                </div>
                {viewingSale.paymentMethod && (
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-slate-500">Payment</span>
                    <span className="text-slate-700">{viewingSale.paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button onClick={() => setViewingSale(null)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
                Close
              </button>
              <button
                onClick={() => { setViewingSale(null); setPrintingSale(viewingSale); }}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Invoice
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
