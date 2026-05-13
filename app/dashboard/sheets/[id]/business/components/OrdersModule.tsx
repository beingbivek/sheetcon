// app/dashboard/sheets/[id]/business/components/OrdersModule.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BusinessConfig, Connection } from '../BusinessApp';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
type AgentType = 'STAFF' | 'COURIER';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variation: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Delivery {
  id: string;
  agentType: AgentType;
  agentName: string;
  agentPhone: string | null;
  courierName: string | null;
  trackingCode: string | null;
  deliveryFee: number;
  notes: string | null;
  assignedAt: string;
  deliveredAt: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  notes: string | null;
  confirmedAt: string | null;
  packedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  returnedAt: string | null;
  createdAt: string;
  items?: OrderItem[];
  delivery?: Delivery | null;
}

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  stock: number;
  unit: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface CartEntry {
  productId: string;
  productName: string;
  variation: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrdersModuleProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_FLOW: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED',
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PACKED: 'bg-violet-100 text-violet-700',
  DISPATCHED: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: '⏳ Pending',
  CONFIRMED: '✅ Confirmed',
  PACKED: '📦 Packed',
  DISPATCHED: '🚚 Dispatched',
  DELIVERED: '✓ Delivered',
  CANCELLED: '✕ Cancelled',
  RETURNED: '↩ Returned',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdersModule({ connection, config, fmt }: OrdersModuleProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('0');
  const [notes, setNotes] = useState('');

  // Status update form
  const [newStatus, setNewStatus] = useState<OrderStatus>('PENDING');
  const [agentType, setAgentType] = useState<AgentType>('STAFF');
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [courierName, setCourierName] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [statusAmountPaid, setStatusAmountPaid] = useState('');
  const [statusPaymentMethod, setStatusPaymentMethod] = useState('Cash');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordRes, prodRes, custRes] = await Promise.all([
        fetch(`/api/user/sheets/${connection.id}/business/orders`),
        fetch(`/api/user/sheets/${connection.id}/business/products`),
        fetch(`/api/user/sheets/${connection.id}/business/customers`),
      ]);
      const [ordData, prodData, custData] = await Promise.all([
        ordRes.json(), prodRes.json(), custRes.json(),
      ]);
      if (!ordRes.ok) throw new Error(ordData.error ?? 'Failed to load orders');
      setOrders(ordData.orders ?? []);
      setProducts(prodData.products ?? []);
      setCustomers(custData.customers ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Cart
  const addToCart = (product: Product) => {
    const existing = cart.findIndex(c => c.productId === product.id);
    if (existing !== -1) {
      const updated = [...cart];
      updated[existing].quantity += 1;
      updated[existing].total = updated[existing].quantity * updated[existing].unitPrice;
      setCart(updated);
    } else {
      setCart(prev => [...prev, {
        productId: product.id, productName: product.name,
        variation: '', quantity: 1, unitPrice: product.sellingPrice,
        total: product.sellingPrice,
      }]);
    }
  };

  const updateCartQty = (idx: number, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter((_, i) => i !== idx)); return; }
    const updated = [...cart];
    updated[idx].quantity = qty;
    updated[idx].total = qty * updated[idx].unitPrice;
    setCart(updated);
  };

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const total = subtotal + (parseFloat(deliveryFee) || 0) - (parseFloat(discountAmount) || 0);
  const paid = parseFloat(amountPaid) || 0;
  const due = Math.max(0, total - paid);
  const payStatus: PaymentStatus = paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const found = customers.find(c => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone ?? '');
      setCustomerAddress(found.address ?? '');
    }
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) { setFormError('Add at least one item'); return; }
    setSaving(true); setFormError('');
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/business/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, customerId: customerId || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerAddress: customerAddress || null,
          subtotal, deliveryFee: parseFloat(deliveryFee) || 0,
          discountAmount: parseFloat(discountAmount) || 0,
          total, amountPaid: paid, amountDue: due,
          paymentMethod, paymentStatus: payStatus,
          notes: notes.trim() || null,
          items: cart.map(c => ({
            productId: c.productId, productName: c.productName,
            variation: c.variation || null, quantity: c.quantity,
            unitPrice: c.unitPrice, total: c.total,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create order');
      setShowForm(false);
      setCart([]); setCustomerId(''); setCustomerName('');
      setCustomerPhone(''); setCustomerAddress('');
      setDeliveryFee('0'); setDiscountAmount('0');
      setAmountPaid('0'); setNotes('');
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!showStatusModal) return;
    setSaving(true); setFormError('');
    try {
      const needsDelivery = ['DISPATCHED', 'DELIVERED'].includes(newStatus);
      if (needsDelivery && !agentName.trim()) {
        setFormError('Delivery agent name is required for dispatch/delivery');
        setSaving(false); return;
      }
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/orders/${showStatusModal.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            amountPaid: parseFloat(statusAmountPaid) || showStatusModal.amountPaid,
            paymentMethod: statusPaymentMethod || showStatusModal.paymentMethod,
            delivery: needsDelivery ? {
              agentType, agentName: agentName.trim(),
              agentPhone: agentPhone.trim() || null,
              courierName: agentType === 'COURIER' ? courierName.trim() || null : null,
              trackingCode: trackingCode.trim() || null,
              deliveryFee: showStatusModal.deliveryFee,
              notes: null,
            } : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update status');
      setShowStatusModal(null);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Delete this order? Stock will be restored if confirmed. Cannot be undone.')) return;
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/orders/${orderId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (viewingOrder?.id === orderId) setViewingOrder(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openStatusModal = (order: Order) => {
    setShowStatusModal(order);
    setNewStatus(order.status);
    setAgentType(order.delivery?.agentType ?? 'STAFF');
    setAgentName(order.delivery?.agentName ?? '');
    setAgentPhone(order.delivery?.agentPhone ?? '');
    setCourierName(order.delivery?.courierName ?? '');
    setTrackingCode(order.delivery?.trackingCode ?? '');
    setStatusAmountPaid(String(order.amountPaid));
    setStatusPaymentMethod(order.paymentMethod ?? 'Cash');
    setFormError('');
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch =
      o.orderNumber.toLowerCase().includes(q) ||
      (o.customerName ?? '').toLowerCase().includes(q) ||
      (o.customerPhone ?? '').includes(q);
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Online Orders</h2>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} total orders</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </button>
      </div>

      {/* Status counts */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['ALL', ...STATUS_FLOW, 'CANCELLED', 'RETURNED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'ALL' ? `All (${orders.length})` : `${STATUS_LABELS[s as OrderStatus]} (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
        </svg>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search orders, customers..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl block mb-3">📦</span>
          <p className="text-slate-600 font-medium mb-1">No orders found</p>
          <p className="text-slate-400 text-sm mb-4">
            {search || statusFilter !== 'ALL' ? 'Try different filters' : 'Record your first online order'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              New Order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{order.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                      order.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500 space-y-0.5">
                    {order.customerName && <p>👤 {order.customerName} {order.customerPhone ? `· ${order.customerPhone}` : ''}</p>}
                    {order.customerAddress && <p>📍 {order.customerAddress}</p>}
                    {order.delivery && (
                      <p>🚚 {order.delivery.agentType === 'COURIER' ? `${order.delivery.courierName ?? 'Courier'} · ${order.delivery.agentName}` : order.delivery.agentName}
                        {order.delivery.trackingCode ? ` · #${order.delivery.trackingCode}` : ''}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900">{fmt(order.total)}</p>
                  {order.amountDue > 0 && (
                    <p className="text-xs text-red-500">Due: {fmt(order.amountDue)}</p>
                  )}
                  <p className="text-xs text-slate-400">{order.items?.length ?? 0} items</p>
                </div>
              </div>

              {/* Progress bar for active orders */}
              {!['CANCELLED', 'RETURNED'].includes(order.status) && (
                <div className="mt-3 flex items-center gap-1">
                  {STATUS_FLOW.map((s, idx) => {
                    const currentIdx = STATUS_FLOW.indexOf(order.status as any);
                    const isActive = idx <= currentIdx && order.status !== 'CANCELLED' && order.status !== 'RETURNED';
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${isActive ? 'bg-blue-500' : 'bg-slate-200'}`} />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setViewingOrder(order)}
                  className="flex-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  View Details
                </button>
                {!['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status) && (
                  <button
                    onClick={() => openStatusModal(order)}
                    className="flex-1 px-3 py-1.5 text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                  >
                    Update Status
                  </button>
                )}
                <button
                  onClick={() => handleDelete(order.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Order Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">New Online Order</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>
              )}

              {/* Customer */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Customer">
                  <select value={customerId} onChange={e => handleCustomerChange(e.target.value)} className={iCls}>
                    <option value="">Manual entry</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Order Date">
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={iCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Customer Name">
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="Full name" className={iCls} />
                </Field>
                <Field label="Phone">
                  <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+977-9800000000" className={iCls} />
                </Field>
              </div>

              <Field label="Delivery Address">
                <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="Full delivery address" className={iCls} />
              </Field>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">Items *</label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto mb-3 bg-slate-50 rounded-xl p-3">
                  {products.filter(p => p.stock > 0).map(p => (
                    <button key={p.id} onClick={() => addToCart(p)}
                      className="text-left p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 transition-colors text-xs">
                      <p className="font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-slate-400">{fmt(p.sellingPrice)}</p>
                    </button>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div className="space-y-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                        <span className="flex-1 text-sm font-medium text-slate-900 truncate">{item.productName}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCartQty(idx, item.quantity - 1)}
                            className="w-6 h-6 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50 text-xs">−</button>
                          <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                          <button onClick={() => updateCartQty(idx, item.quantity + 1)}
                            className="w-6 h-6 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50 text-xs">+</button>
                        </div>
                        <span className="text-sm font-bold text-slate-900 w-20 text-right">{fmt(item.total)}</span>
                        <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <Field label={`Delivery Fee (${config.currencySymbol})`}>
                  <input type="number" min={0} value={deliveryFee}
                    onChange={e => setDeliveryFee(e.target.value)} className={iCls} />
                </Field>
                <Field label={`Discount (${config.currencySymbol})`}>
                  <input type="number" min={0} value={discountAmount}
                    onChange={e => setDiscountAmount(e.target.value)} className={iCls} />
                </Field>
              </div>

              {/* Totals */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{fmt(subtotal)}</span></div>
                {parseFloat(deliveryFee) > 0 && <div className="flex justify-between"><span className="text-slate-600">Delivery</span><span>{fmt(parseFloat(deliveryFee))}</span></div>}
                {parseFloat(discountAmount) > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{fmt(parseFloat(discountAmount))}</span></div>}
                <div className="flex justify-between font-bold pt-2 border-t border-blue-200">
                  <span className="text-blue-900">Total</span><span className="text-blue-900">{fmt(total)}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Payment Method">
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={iCls}>
                    <option value="Cash">Cash on Delivery</option>
                    <option value="eSewa">eSewa</option>
                    <option value="Khalti">Khalti</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field label={`Amount Paid (${config.currencySymbol})`}>
                  <input type="number" min={0} value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)} className={iCls} />
                </Field>
              </div>

              {due > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-red-700 font-medium">Amount Due on Delivery</span>
                  <span className="text-red-700 font-bold">{fmt(due)}</span>
                </div>
              )}

              <Field label="Notes">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Special instructions, notes..." rows={2} className={iCls} />
              </Field>
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button onClick={() => setShowForm(false)} disabled={saving}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCreateOrder} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                {saving ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Update Modal ── */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Update Order Status</h3>
                <p className="text-sm text-slate-400">{showStatusModal.orderNumber}</p>
              </div>
              <button onClick={() => setShowStatusModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>
              )}

              <Field label="New Status">
                <div className="grid grid-cols-2 gap-2">
                  {(['CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED'] as OrderStatus[]).map(s => (
                    <button key={s} onClick={() => setNewStatus(s)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-colors ${
                        newStatus === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Delivery fields for DISPATCHED/DELIVERED */}
              {['DISPATCHED', 'DELIVERED'].includes(newStatus) && (
                <div className="space-y-4 bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700">Delivery Agent</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setAgentType('STAFF')}
                      className={`py-2 rounded-lg text-xs font-medium border-2 transition-colors ${agentType === 'STAFF' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                      👤 Own Staff
                    </button>
                    <button onClick={() => setAgentType('COURIER')}
                      className={`py-2 rounded-lg text-xs font-medium border-2 transition-colors ${agentType === 'COURIER' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                      📦 Courier
                    </button>
                  </div>
                  {agentType === 'COURIER' && (
                    <Field label="Courier Service">
                      <input type="text" value={courierName} onChange={e => setCourierName(e.target.value)}
                        placeholder="e.g. Daraz, Pathao, In-Drive" className={iCls} />
                    </Field>
                  )}
                  <Field label="Agent Name *">
                    <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                      placeholder="Delivery person name" className={iCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Agent Phone">
                      <input type="text" value={agentPhone} onChange={e => setAgentPhone(e.target.value)}
                        placeholder="Phone number" className={iCls} />
                    </Field>
                    <Field label="Tracking Code">
                      <input type="text" value={trackingCode} onChange={e => setTrackingCode(e.target.value)}
                        placeholder="Optional" className={iCls} />
                    </Field>
                  </div>
                </div>
              )}

              {/* Payment update */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount Paid">
                  <input type="number" min={0} value={statusAmountPaid}
                    onChange={e => setStatusAmountPaid(e.target.value)} className={iCls} />
                </Field>
                <Field label="Payment Method">
                  <select value={statusPaymentMethod} onChange={e => setStatusPaymentMethod(e.target.value)} className={iCls}>
                    <option value="Cash">Cash</option>
                    <option value="eSewa">eSewa</option>
                    <option value="Khalti">Khalti</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button onClick={() => setShowStatusModal(null)} disabled={saving}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleStatusUpdate} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                {saving ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Order Modal ── */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingOrder.orderNumber}</h3>
                <p className="text-xs text-slate-400">{new Date(viewingOrder.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewingOrder.status]}`}>
                  {STATUS_LABELS[viewingOrder.status]}
                </span>
                <button onClick={() => setViewingOrder(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Customer */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
                <p className="font-semibold text-slate-700 mb-2">Customer</p>
                {viewingOrder.customerName && <p className="text-slate-900">{viewingOrder.customerName}</p>}
                {viewingOrder.customerPhone && <p className="text-slate-500">{viewingOrder.customerPhone}</p>}
                {viewingOrder.customerAddress && <p className="text-slate-500">{viewingOrder.customerAddress}</p>}
              </div>

              {/* Items */}
              {viewingOrder.items && viewingOrder.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Items</p>
                  <div className="space-y-2">
                    {viewingOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                          {item.variation && <p className="text-xs text-slate-400">{item.variation}</p>}
                          <p className="text-xs text-slate-400">{item.quantity} × {fmt(item.unitPrice)}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{fmt(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{fmt(viewingOrder.subtotal)}</span></div>
                {viewingOrder.deliveryFee > 0 && <div className="flex justify-between"><span className="text-slate-600">Delivery</span><span>{fmt(viewingOrder.deliveryFee)}</span></div>}
                {viewingOrder.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{fmt(viewingOrder.discountAmount)}</span></div>}
                <div className="flex justify-between font-bold pt-2 border-t border-blue-200">
                  <span className="text-blue-900">Total</span><span className="text-blue-900">{fmt(viewingOrder.total)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-slate-600">Paid</span>
                  <span className="text-emerald-700 font-medium">{fmt(viewingOrder.amountPaid)}</span>
                </div>
                {viewingOrder.amountDue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Due</span>
                    <span className="text-red-600 font-medium">{fmt(viewingOrder.amountDue)}</span>
                  </div>
                )}
              </div>

              {/* Delivery */}
              {viewingOrder.delivery && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-1">
                  <p className="font-semibold text-amber-900 mb-2">Delivery Info</p>
                  <p className="text-amber-800">
                    {viewingOrder.delivery.agentType === 'COURIER'
                      ? `${viewingOrder.delivery.courierName ?? 'Courier'} via ${viewingOrder.delivery.agentName}`
                      : `Staff: ${viewingOrder.delivery.agentName}`}
                  </p>
                  {viewingOrder.delivery.agentPhone && <p className="text-amber-700">{viewingOrder.delivery.agentPhone}</p>}
                  {viewingOrder.delivery.trackingCode && <p className="text-amber-700">Tracking: #{viewingOrder.delivery.trackingCode}</p>}
                  {viewingOrder.delivery.deliveredAt && <p className="text-emerald-700">Delivered: {new Date(viewingOrder.delivery.deliveredAt).toLocaleString()}</p>}
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-3">Timeline</p>
                <div className="space-y-2 text-xs text-slate-500">
                  <p>📝 Created: {new Date(viewingOrder.createdAt).toLocaleString()}</p>
                  {viewingOrder.confirmedAt && <p>✅ Confirmed: {new Date(viewingOrder.confirmedAt).toLocaleString()}</p>}
                  {viewingOrder.packedAt && <p>📦 Packed: {new Date(viewingOrder.packedAt).toLocaleString()}</p>}
                  {viewingOrder.dispatchedAt && <p>🚚 Dispatched: {new Date(viewingOrder.dispatchedAt).toLocaleString()}</p>}
                  {viewingOrder.deliveredAt && <p>✓ Delivered: {new Date(viewingOrder.deliveredAt).toLocaleString()}</p>}
                  {viewingOrder.cancelledAt && <p>✕ Cancelled: {new Date(viewingOrder.cancelledAt).toLocaleString()}</p>}
                  {viewingOrder.returnedAt && <p>↩ Returned: {new Date(viewingOrder.returnedAt).toLocaleString()}</p>}
                </div>
              </div>

              {viewingOrder.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{viewingOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex-shrink-0 flex gap-3">
              <button onClick={() => setViewingOrder(null)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
                Close
              </button>
              {!['DELIVERED', 'CANCELLED', 'RETURNED'].includes(viewingOrder.status) && (
                <button onClick={() => { setViewingOrder(null); openStatusModal(viewingOrder); }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Update Status
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