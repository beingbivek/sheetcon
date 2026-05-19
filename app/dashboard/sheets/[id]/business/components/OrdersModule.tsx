"use client";

import { useState, useEffect } from "react";
import type { BusinessConfig, Connection } from "../BusinessApp";

// ── Types ────────────────────────────────────────────────────────────────────

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
  orderId: string;
  agentType: "STAFF" | "COURIER";
  agentName: string;
  agentPhone: string | null;
  courierName: string | null;
  trackingCode: string | null;
  deliveryFee: number;
  notes: string | null;
  assignedAt: string;
  deliveredAt: string | null;
}

interface BusinessOrder {
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
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PACKED"
    | "DISPATCHED"
    | "DELIVERED"
    | "CANCELLED"
    | "RETURNED";
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

type OrderStatus = BusinessOrder["status"];

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "DISPATCHED",
  "DELIVERED",
];
const TERMINAL_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED", "RETURNED"];
const ACTIVE_STATUSES: OrderStatus[] = ["CONFIRMED", "PACKED", "DISPATCHED"];

const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; icon: string }
> = {
  PENDING:    { label: "Pending",    color: "bg-slate-100 text-slate-600",   icon: "⏳" },
  CONFIRMED:  { label: "Confirmed",  color: "bg-blue-100 text-blue-700",     icon: "✅" },
  PACKED:     { label: "Packed",     color: "bg-violet-100 text-violet-700", icon: "📦" },
  DISPATCHED: { label: "Dispatched", color: "bg-amber-100 text-amber-700",   icon: "🚚" },
  DELIVERED:  { label: "Delivered",  color: "bg-emerald-100 text-emerald-700", icon: "✓" },
  CANCELLED:  { label: "Cancelled",  color: "bg-red-100 text-red-700",       icon: "✕" },
  RETURNED:   { label: "Returned",   color: "bg-orange-100 text-orange-700", icon: "↩" },
};

const PAYMENT_COLOR: Record<BusinessOrder["paymentStatus"], string> = {
  PAID:    "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  UNPAID:  "bg-red-100 text-red-700",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrdersModule({ connection, config, fmt }: Props) {
  const [orders, setOrders]   = useState<BusinessOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [search, setSearch]             = useState("");

  // Update status modal
  const [updateTarget, setUpdateTarget]             = useState<BusinessOrder | null>(null);
  const [newStatus, setNewStatus]                   = useState<OrderStatus>("CONFIRMED");
  const [agentType, setAgentType]                   = useState<"STAFF" | "COURIER">("STAFF");
  const [agentName, setAgentName]                   = useState("");
  const [agentPhone, setAgentPhone]                 = useState("");
  const [courierName, setCourierName]               = useState("");
  const [trackingCode, setTrackingCode]             = useState("");
  const [updateAmountPaid, setUpdateAmountPaid]     = useState("0");
  const [updatePaymentMethod, setUpdatePaymentMethod] = useState("Cash");
  const [updating, setUpdating]                     = useState(false);
  const [updateError, setUpdateError]               = useState<string | null>(null);

  // View modal
  const [viewOrder, setViewOrder] = useState<BusinessOrder | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<BusinessOrder | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/user/sheets/${connection.id}/business/orders`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load orders");
      setOrders(data.orders ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [connection.id]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = orders
    .filter((o) => {
      const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q) ||
        (o.customerPhone ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const counts = orders.reduce(
    (acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }),
    {} as Record<string, number>,
  );
  const activeCount = orders.filter((o) =>
    ACTIVE_STATUSES.includes(o.status),
  ).length;

  // ── Open update modal ──────────────────────────────────────────────────────

  const openUpdate = (order: BusinessOrder) => {
    setUpdateTarget(order);
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    const nextStatus =
      currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
        ? STATUS_FLOW[currentIdx + 1]
        : order.status;
    setNewStatus(nextStatus);
    setAgentType("STAFF");
    setAgentName("");
    setAgentPhone("");
    setCourierName("");
    setTrackingCode("");
    setUpdateAmountPaid(String(order.amountPaid));
    setUpdatePaymentMethod(order.paymentMethod ?? "Cash");
    setUpdateError(null);
  };

  // ── Update status ──────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!updateTarget) return;
    const needsDelivery =
      newStatus === "DISPATCHED" || newStatus === "DELIVERED";
    if (needsDelivery && !agentName.trim()) {
      setUpdateError("Agent name is required for dispatch/delivery");
      return;
    }
    setUpdating(true);
    setUpdateError(null);
    try {
      const body: Record<string, any> = {
        status: newStatus,
        amountPaid: parseFloat(updateAmountPaid) || updateTarget.amountPaid,
        paymentMethod: updatePaymentMethod,
      };
      if (needsDelivery) {
        body.delivery = {
          agentType,
          agentName: agentName.trim(),
          agentPhone: agentPhone.trim() || null,
          courierName: courierName.trim() || null,
          trackingCode: trackingCode.trim() || null,
          deliveryFee: updateTarget.deliveryFee,
          notes: null,
        };
      }
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/orders/${updateTarget.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      await fetchOrders();
      setUpdateTarget(null);
    } catch (err: any) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete order ───────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/orders/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      await fetchOrders();
      setDeleteTarget(null);
      if (viewOrder?.id === deleteTarget.id) setViewOrder(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const m = STATUS_META[status];
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.color}`}>
        {m.icon} {m.label}
      </span>
    );
  };

  const ProgressBar = ({ status }: { status: OrderStatus }) => {
    const step = STATUS_FLOW.indexOf(status);
    if (step < 0) return null;
    return (
      <div className="flex items-center gap-0.5 mt-2">
        {STATUS_FLOW.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-blue-500" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    );
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center m-4">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-3 text-sm text-red-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Online Orders</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Orders created from{" "}
            <span className="font-medium text-blue-600">
              Sales / POS → 🌐 Online tab
            </span>
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-blue-500 text-xl flex-shrink-0">ℹ️</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">
            Creating Online Orders
          </p>
          <p className="text-sm text-blue-600 mt-0.5">
            Go to <strong>Sales / POS</strong> and select the{" "}
            <strong>🌐 Online</strong> tab to create a new order. It will appear
            here for fulfillment tracking.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Orders",
            value: orders.length,
            icon: "📦",
            highlight: false,
          },
          {
            label: "Active",
            value: activeCount,
            icon: "🔄",
            highlight: activeCount > 0,
          },
          {
            label: "Delivered",
            value: counts.DELIVERED ?? 0,
            icon: "✅",
            highlight: false,
          },
          {
            label: "Pending",
            value: counts.PENDING ?? 0,
            icon: "⏳",
            highlight: (counts.PENDING ?? 0) > 0,
          },
        ].map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border p-3 text-center shadow-sm ${
              k.highlight
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <p className="text-xl mb-1">{k.icon}</p>
            <p
              className={`text-2xl font-bold ${
                k.highlight ? "text-amber-700" : "text-slate-800"
              }`}
            >
              {k.value}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by order #, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as OrderStatus | "ALL")
          }
          className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses ({orders.length})</option>
          {(
            [
              "PENDING",
              "CONFIRMED",
              "PACKED",
              "DISPATCHED",
              "DELIVERED",
              "CANCELLED",
              "RETURNED",
            ] as OrderStatus[]
          ).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].icon} {STATUS_META[s].label}
              {counts[s] ? ` (${counts[s]})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">📦</p>
          <p className="text-slate-600 font-medium">No orders found</p>
          <p className="text-slate-400 text-sm mt-1">
            {search || statusFilter !== "ALL"
              ? "Try different filters"
              : "Create orders from Sales / POS → Online tab"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} />
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        PAYMENT_COLOR[order.paymentStatus]
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                  <ProgressBar status={order.status} />
                  <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                    <p>
                      <span className="font-medium text-slate-700">
                        {order.customerName ?? "Walk-in"}
                      </span>
                      {order.customerPhone && ` · ${order.customerPhone}`}
                    </p>
                    {order.customerAddress && (
                      <p className="truncate">📍 {order.customerAddress}</p>
                    )}
                    <p>{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Right */}
                <div className="flex-shrink-0 text-right">
                  <p className="font-bold text-slate-900 text-base">
                    {fmt(order.total)}
                  </p>
                  {order.amountDue > 0 && (
                    <p className="text-xs text-red-500">
                      Due: {fmt(order.amountDue)}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mb-2">
                    {order.items?.length ?? 0} items
                  </p>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => setViewOrder(order)}
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                    >
                      View
                    </button>
                    {!TERMINAL_STATUSES.includes(order.status) && (
                      <button
                        onClick={() => openUpdate(order)}
                        className="text-xs px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors font-medium"
                      >
                        Update
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(order)}
                      className="text-xs px-2 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                      title="Delete order"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Delivery strip */}
              {order.delivery && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span>🚚 {order.delivery.agentName}</span>
                  {order.delivery.agentPhone && (
                    <span>📞 {order.delivery.agentPhone}</span>
                  )}
                  {order.delivery.courierName && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded">
                      {order.delivery.courierName}
                    </span>
                  )}
                  {order.delivery.trackingCode && (
                    <span>📋 #{order.delivery.trackingCode}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Update Status Modal ───────────────────────────────────────────── */}
      {updateTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Update Order Status
                </h3>
                <p className="text-xs text-slate-500">
                  {updateTarget.orderNumber} · currently{" "}
                  <span className="font-medium">
                    {STATUS_META[updateTarget.status].label}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setUpdateTarget(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {updateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {updateError}
                </div>
              )}

              {/* Status grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  New Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      "CONFIRMED",
                      "PACKED",
                      "DISPATCHED",
                      "DELIVERED",
                      "CANCELLED",
                      "RETURNED",
                    ] as OrderStatus[]
                  ).map((s) => {
                    const m = STATUS_META[s];
                    return (
                      <button
                        key={s}
                        onClick={() => setNewStatus(s)}
                        className={`py-2 px-2 text-xs rounded-lg border-2 transition-colors font-medium ${
                          newStatus === s
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {m.icon} {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delivery fields */}
              {(newStatus === "DISPATCHED" || newStatus === "DELIVERED") && (
                <div className="space-y-3 bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Delivery Agent
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["STAFF", "COURIER"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAgentType(t)}
                        className={`py-2 rounded-lg text-xs font-medium border-2 transition-colors ${
                          agentType === t
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-500"
                        }`}
                      >
                        {t === "STAFF" ? "👤 Own Staff" : "📦 Courier"}
                      </button>
                    ))}
                  </div>
                  {agentType === "COURIER" && (
                    <div>
                      <label className={labelCls}>Courier Service</label>
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. Daraz, Pathao"
                        className={iCls}
                      />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Agent Name *</label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Delivery person name"
                      className={iCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Agent Phone</label>
                      <input
                        type="text"
                        value={agentPhone}
                        onChange={(e) => setAgentPhone(e.target.value)}
                        placeholder="Optional"
                        className={iCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Tracking Code</label>
                      <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        placeholder="Optional"
                        className={iCls}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment update */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    Amount Paid ({config.currencySymbol})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={updateAmountPaid}
                    onChange={(e) => setUpdateAmountPaid(e.target.value)}
                    className={iCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select
                    value={updatePaymentMethod}
                    onChange={(e) => setUpdatePaymentMethod(e.target.value)}
                    className={iCls}
                  >
                    {["Cash", "eSewa", "Khalti", "Bank Transfer", "Other"].map(
                      (m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              {/* Due preview */}
              {(() => {
                const paid = parseFloat(updateAmountPaid) || 0;
                const due = Math.max(0, updateTarget.total - paid);
                return due > 0 ? (
                  <div className="flex justify-between bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                    <span className="text-red-700 font-medium">
                      Remaining Due
                    </span>
                    <span className="text-red-700 font-bold">{fmt(due)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                    <span className="text-emerald-700 font-medium">
                      Fully Paid
                    </span>
                    <span className="text-emerald-700 font-bold">✓</span>
                  </div>
                );
              })()}
            </div>

            <div className="p-5 border-t border-slate-200 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setUpdateTarget(null)}
                disabled={updating}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {updating && (
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {updating ? "Updating…" : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Order Modal ──────────────────────────────────────────────── */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {viewOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  {new Date(viewOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={viewOrder.status} />
                <button
                  onClick={() => setViewOrder(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 ml-1"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Customer */}
              <Section title="Customer">
                <div className="text-sm space-y-0.5">
                  <p className="font-medium text-slate-900">
                    {viewOrder.customerName ?? "Walk-in"}
                  </p>
                  {viewOrder.customerPhone && (
                    <p className="text-slate-500">{viewOrder.customerPhone}</p>
                  )}
                  {viewOrder.customerAddress && (
                    <p className="text-slate-500">{viewOrder.customerAddress}</p>
                  )}
                </div>
              </Section>

              {/* Items */}
              {viewOrder.items && viewOrder.items.length > 0 && (
                <Section title="Items">
                  <div className="space-y-2">
                    {viewOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between py-2 border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {item.productName}
                          </p>
                          {item.variation && (
                            <p className="text-xs text-slate-400">
                              {item.variation}
                            </p>
                          )}
                          <p className="text-xs text-slate-400">
                            {item.quantity} × {fmt(item.unitPrice)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {fmt(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Totals */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                <Row label="Subtotal" value={fmt(viewOrder.subtotal)} />
                {viewOrder.deliveryFee > 0 && (
                  <Row
                    label="Delivery Fee"
                    value={fmt(viewOrder.deliveryFee)}
                  />
                )}
                {viewOrder.discountAmount > 0 && (
                  <Row
                    label="Discount"
                    value={`-${fmt(viewOrder.discountAmount)}`}
                    valueClass="text-emerald-700"
                  />
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-blue-200">
                  <span className="text-blue-900">Total</span>
                  <span className="text-blue-900">{fmt(viewOrder.total)}</span>
                </div>
                <Row
                  label="Paid"
                  value={fmt(viewOrder.amountPaid)}
                  valueClass="text-emerald-700 font-medium"
                />
                {viewOrder.amountDue > 0 && (
                  <Row
                    label="Due"
                    value={fmt(viewOrder.amountDue)}
                    valueClass="text-red-600 font-medium"
                  />
                )}
                {viewOrder.paymentMethod && (
                  <Row label="Payment" value={viewOrder.paymentMethod} />
                )}
              </div>

              {/* Delivery info */}
              {viewOrder.delivery && (
                <Section title="Delivery">
                  <div className="text-sm space-y-1">
                    <p className="text-slate-900">
                      {viewOrder.delivery.agentType === "COURIER"
                        ? `${viewOrder.delivery.courierName ?? "Courier"} via ${viewOrder.delivery.agentName}`
                        : `Staff: ${viewOrder.delivery.agentName}`}
                    </p>
                    {viewOrder.delivery.agentPhone && (
                      <p className="text-slate-500">
                        {viewOrder.delivery.agentPhone}
                      </p>
                    )}
                    {viewOrder.delivery.trackingCode && (
                      <p className="text-slate-500">
                        Tracking: #{viewOrder.delivery.trackingCode}
                      </p>
                    )}
                    {viewOrder.delivery.deliveredAt && (
                      <p className="text-emerald-700">
                        Delivered:{" "}
                        {new Date(
                          viewOrder.delivery.deliveredAt,
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                </Section>
              )}

              {/* Timeline */}
              <Section title="Timeline">
                <div className="space-y-1.5 text-xs text-slate-500">
                  <p>📝 Created: {new Date(viewOrder.createdAt).toLocaleString()}</p>
                  {viewOrder.confirmedAt && (
                    <p>✅ Confirmed: {new Date(viewOrder.confirmedAt).toLocaleString()}</p>
                  )}
                  {viewOrder.packedAt && (
                    <p>📦 Packed: {new Date(viewOrder.packedAt).toLocaleString()}</p>
                  )}
                  {viewOrder.dispatchedAt && (
                    <p>🚚 Dispatched: {new Date(viewOrder.dispatchedAt).toLocaleString()}</p>
                  )}
                  {viewOrder.deliveredAt && (
                    <p>✓ Delivered: {new Date(viewOrder.deliveredAt).toLocaleString()}</p>
                  )}
                  {viewOrder.cancelledAt && (
                    <p>✕ Cancelled: {new Date(viewOrder.cancelledAt).toLocaleString()}</p>
                  )}
                  {viewOrder.returnedAt && (
                    <p>↩ Returned: {new Date(viewOrder.returnedAt).toLocaleString()}</p>
                  )}
                </div>
              </Section>

              {/* Notes */}
              {viewOrder.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-amber-900">{viewOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setViewOrder(null)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Close
              </button>
              {!TERMINAL_STATUSES.includes(viewOrder.status) && (
                <button
                  onClick={() => {
                    setViewOrder(null);
                    openUpdate(viewOrder);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  Update Status
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <p className="text-3xl mb-3">⚠️</p>
              <h3 className="text-base font-bold text-slate-800">
                Delete Order?
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                <strong>{deleteTarget.orderNumber}</strong> will be permanently
                deleted. Stock will be restored if the order was confirmed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared style constants ─────────────────────────────────────────────────────

const iCls =
  "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const labelCls = "block text-xs font-medium text-slate-600 mb-1";

// ── Tiny layout helpers ────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "text-slate-700",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
