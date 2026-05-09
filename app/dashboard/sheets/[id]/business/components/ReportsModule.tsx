// app/dashboard/sheets/[id]/business/components/ReportsModule.tsx (COMPLETE REPLACEMENT)

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { BusinessConfig, Connection } from '../BusinessApp';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#ec4899',
  '#6366f1',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Overview {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
  totalSales: number;
  totalPurchases: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  lowStockCount: number;
}

interface SalesByDate {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  totalQty: number;
  totalRevenue: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  minStock: number;
  unit: string | null;
}

interface RecentSale {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  total: number;
  status: string;
  createdAt: string;
}

interface RecentPurchase {
  id: string;
  invoiceNumber: string;
  supplierName: string | null;
  landedCost: number;
  status: string;
  createdAt: string;
}

interface CustomerSummary {
  customerId: string;
  customerName: string;
  totalOrders: number;
  totalSpent: number;
}

interface SupplierSummary {
  supplierId: string;
  supplierName: string;
  totalPurchases: number;
  totalSpent: number;
}

interface BusinessReport {
  overview: Overview;
  salesByDate: SalesByDate[];
  topProducts: TopProduct[];
  lowStockProducts: LowStockProduct[];
  recentSales: RecentSale[];
  recentPurchases: RecentPurchase[];
  customerSummary: CustomerSummary[];
  supplierSummary: SupplierSummary[];
}

type ReportTab =
  | 'overview'
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'purchases';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportsModuleProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsModule({
  connection,
  config,
}: ReportsModuleProps) {
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  const fmt = useCallback(
    (amount: number) =>
      `${config.currencySymbol} ${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [config.currencySymbol]
  );

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/reports`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load report');
      setReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-slate-500 text-sm">Generating reports...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium mb-1">Failed to load reports</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchReport}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: ReportTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'suppliers', label: 'Suppliers', icon: '🏭' },
    { id: 'purchases', label: 'Purchases', icon: '🛒' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Reports & Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Business performance overview
          </p>
        </div>
        <button
          onClick={fetchReport}
          className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab report={report} fmt={fmt} config={config} />
      )}
      {activeTab === 'sales' && (
        <SalesTab report={report} fmt={fmt} />
      )}
      {activeTab === 'inventory' && (
        <InventoryTab report={report} fmt={fmt} config={config} />
      )}
      {activeTab === 'customers' && (
        <CustomersTab report={report} fmt={fmt} />
      )}
      {activeTab === 'suppliers' && (
        <SuppliersTab report={report} fmt={fmt} />
      )}
      {activeTab === 'purchases' && (
        <PurchasesTab report={report} fmt={fmt} />
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  report,
  fmt,
  config,
}: {
  report: BusinessReport;
  fmt: (n: number) => string;
  config: BusinessConfig;
}) {
  const ov = report.overview;

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: fmt(ov.totalRevenue),
      icon: '💰',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Total Cost',
      value: fmt(ov.totalCost),
      icon: '🛒',
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
    },
    {
      label: 'Gross Profit',
      value: fmt(ov.grossProfit),
      sub: `${ov.grossMargin.toFixed(1)}% margin`,
      icon: '📈',
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Sales Orders',
      value: String(ov.totalSales),
      icon: '🧾',
      color: 'text-violet-700',
      bg: 'bg-violet-50 border-violet-200',
    },
    {
      label: 'Purchase Orders',
      value: String(ov.totalPurchases),
      icon: '📋',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
    {
      label: 'Customers',
      value: String(ov.totalCustomers),
      icon: '👥',
      color: 'text-pink-700',
      bg: 'bg-pink-50 border-pink-200',
    },
    {
      label: 'Products',
      value: String(ov.totalProducts),
      icon: '📦',
      color: 'text-slate-700',
      bg: 'bg-slate-50 border-slate-200',
    },
    {
      label: 'Low Stock',
      value: String(ov.lowStockCount),
      icon: '⚠️',
      color: ov.lowStockCount > 0 ? 'text-red-700' : 'text-emerald-700',
      bg:
        ov.lowStockCount > 0
          ? 'bg-red-50 border-red-200'
          : 'bg-emerald-50 border-emerald-200',
    },
  ];

  const plData =
    ov.grossProfit >= 0
      ? [
          { name: 'Profit', value: ov.grossProfit },
          { name: 'Cost', value: ov.totalCost },
        ]
      : [
          { name: 'Revenue', value: ov.totalRevenue },
          { name: 'Loss', value: Math.abs(ov.grossProfit) },
        ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className={`border rounded-xl p-4 ${card.bg}`}>
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <span className="text-lg">{card.icon}</span>
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            {card.sub && (
              <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Revenue Trend (Last 30 Days)
          </h3>
          {report.salesByDate.length === 0 ? (
            <EmptyChart />
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.salesByDate}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={d => {
                      const dt = new Date(d);
                      return `${dt.getDate()}/${dt.getMonth() + 1}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={v =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [fmt(value), 'Revenue']}
                    labelFormatter={d => new Date(d).toLocaleDateString()}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Profit & Loss
          </h3>
          {ov.totalRevenue === 0 ? (
            <EmptyChart />
          ) : (
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={plData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {plData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? '#10b981' : '#ef4444'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Revenue</span>
              <span className="font-semibold text-slate-900">
                {fmt(ov.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Cost</span>
              <span className="font-semibold text-slate-900">
                {fmt(ov.totalCost)}
              </span>
            </div>
            <div className="flex justify-between text-xs border-t border-slate-100 pt-1 mt-1">
              <span className="font-semibold text-slate-700">Gross Profit</span>
              <span
                className={`font-bold ${
                  ov.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {fmt(ov.grossProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {report.topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Top 5 Products by Revenue
          </h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.topProducts.slice(0, 5)}
                layout="vertical"
                margin={{ left: 0, right: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={v =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="productName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={120}
                  tickFormatter={v =>
                    v.length > 16 ? v.slice(0, 16) + '…' : v
                  }
                />
                <Tooltip
                  formatter={(v: number) => [fmt(v), 'Revenue']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="totalRevenue"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab({
  report,
  fmt,
}: {
  report: BusinessReport;
  fmt: (n: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Daily Revenue & Orders
        </h3>
        {report.salesByDate.length === 0 ? (
          <EmptyChart label="No sales data yet" />
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.salesByDate}>
                <defs>
                  <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#3b82f6"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="#3b82f6"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#10b981"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="#10b981"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={d => {
                    const dt = new Date(d);
                    return `${dt.getDate()}/${dt.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={v =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'revenue'
                      ? [fmt(value), 'Revenue']
                      : [value, 'Orders']
                  }
                  labelFormatter={d => new Date(d).toLocaleDateString()}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={v => (v === 'revenue' ? 'Revenue' : 'Orders')}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#revGrad2)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#ordGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Top Products by Quantity Sold
          </h3>
          {report.topProducts.length === 0 ? (
            <EmptyChart />
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.topProducts.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="productName"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={v =>
                      v.length > 10 ? v.slice(0, 10) + '…' : v
                    }
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(v: number) => [v, 'Units Sold']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="totalQty" radius={[4, 4, 0, 0]}>
                    {report.topProducts.slice(0, 8).map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Recent Sales
          </h3>
          {report.recentSales.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No sales yet
            </div>
          ) : (
            <div className="space-y-2">
              {report.recentSales.map(sale => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {sale.invoiceNumber}
                    </p>
                    <p className="text-xs text-slate-400">
                      {sale.customerName ?? 'Walk-in'} ·{' '}
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {fmt(sale.total)}
                    </p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        sale.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : sale.status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab({
  report,
  fmt,
  config,
}: {
  report: BusinessReport;
  fmt: (n: number) => string;
  config: BusinessConfig;
}) {
  const threshold = parseInt(config.lowStockThreshold || '5');

  return (
    <div className="space-y-6">
      {report.lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-5 h-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-sm font-semibold text-red-800">
              Low Stock Alert —{' '}
              {report.lowStockProducts.length} product
              {report.lowStockProducts.length !== 1 ? 's' : ''} need restocking
            </h3>
          </div>
          <div className="space-y-2">
            {report.lowStockProducts.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-red-200"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {p.name}
                  </p>
                  {p.sku && (
                    <p className="text-xs text-slate-400">SKU: {p.sku}</p>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      p.stock === 0 ? 'text-red-700' : 'text-amber-700'
                    }`}
                  >
                    {p.stock} {p.unit ?? 'pcs'} left
                  </p>
                  <p className="text-xs text-slate-400">
                    Min: {p.minStock || threshold} {p.unit ?? 'pcs'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          High-Selling Items (by Revenue)
        </h3>
        {report.topProducts.length === 0 ? (
          <EmptyChart label="No sales data yet" />
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.topProducts.slice(0, 10)}
                layout="vertical"
                margin={{ left: 0, right: 30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={v =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="productName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={130}
                  tickFormatter={v =>
                    v.length > 18 ? v.slice(0, 18) + '…' : v
                  }
                />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === 'totalRevenue'
                      ? [fmt(v), 'Revenue']
                      : [v, 'Units']
                  }
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="totalRevenue"
                  name="Revenue"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="totalQty"
                  name="Units Sold"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Product Performance
        </h3>
        {report.topProducts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No product sales recorded
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">
                    Rank
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">
                    Product
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">
                    Units Sold
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.topProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="py-2.5">
                      <span
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-700'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-700'
                            : idx === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2.5 font-medium text-slate-900">
                      {p.productName}
                    </td>
                    <td className="py-2.5 text-right text-slate-700">
                      {p.totalQty.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {fmt(p.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Customers Tab ────────────────────────────────────────────────────────────

function CustomersTab({
  report,
  fmt,
}: {
  report: BusinessReport;
  fmt: (n: number) => string;
}) {
  const top10 = report.customerSummary.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Top Customers by Spending
        </h3>
        {top10.length === 0 ? (
          <EmptyChart label="No customer purchase data yet" />
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ left: 0, right: 30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={v =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="customerName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={120}
                  tickFormatter={v =>
                    v.length > 16 ? v.slice(0, 16) + '…' : v
                  }
                />
                <Tooltip
                  formatter={(v: number) => [fmt(v), 'Total Spent']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="totalSpent" radius={[0, 4, 4, 0]}>
                  {top10.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Customer Purchase Summary
        </h3>
        {report.customerSummary.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No customer data yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">
                    #
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">
                    Customer
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">
                    Orders
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">
                    Total Spent
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">
                    Avg Order
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.customerSummary.map((c, idx) => (
                  <tr key={c.customerId} className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold">
                          {c.customerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">
                          {c.customerName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-slate-700">
                      {c.totalOrders}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {fmt(c.totalSpent)}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">
                      {fmt(
                        c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Suppliers Tab ────────────────────────────────────────────────────────────

function SuppliersTab({
  report,
  fmt,
}: {
  report: BusinessReport;
  fmt: (n: number) => string;
}) {
  const top10 = report.supplierSummary.slice(0, 10);

  const pieData = top10.slice(0, 6).map(s => ({
    name: s.supplierName,
    value: s.totalSpent,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Supplier Spend Distribution
          </h3>
          {pieData.length === 0 ? (
            <EmptyChart label="No purchase data yet" />
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name.slice(0, 10)} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmt(v), 'Total Spent']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Supplier Performance
          </h3>
          {report.supplierSummary.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No supplier data yet
            </div>
          ) : (
            <div className="space-y-3">
              {report.supplierSummary.map((s, idx) => {
                const totalSpent = report.supplierSummary.reduce(
                  (sum, x) => sum + x.totalSpent,
                  0
                );
                const pct =
                  totalSpent > 0 ? (s.totalSpent / totalSpent) * 100 : 0;
                return (
                  <div key={s.supplierId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              CHART_COLORS[idx % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-sm font-medium text-slate-900 truncate max-w-[140px]">
                          {s.supplierName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          {fmt(s.totalSpent)}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">
                          ({s.totalPurchases} orders)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Purchases Tab ────────────────────────────────────────────────────────────

function PurchasesTab({
  report,
  fmt,
}: {
  report: BusinessReport;
  fmt: (n: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Recent Purchases
        </h3>
        {report.recentPurchases.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No purchase data yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">
                    Invoice
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">
                    Supplier
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">
                    Landed Cost
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.recentPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-2.5 text-slate-600 hidden md:table-cell">
                      {p.supplierName ?? '—'}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {fmt(p.landedCost)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-500 text-xs hidden lg:table-cell">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Spent on Purchases',
            value: fmt(report.overview.totalCost),
            icon: '💸',
            color: 'text-red-700',
            bg: 'bg-red-50 border-red-200',
          },
          {
            label: 'Total Purchase Orders',
            value: String(report.overview.totalPurchases),
            icon: '📋',
            color: 'text-blue-700',
            bg: 'bg-blue-50 border-blue-200',
          },
          {
            label: 'Avg Purchase Value',
            value:
              report.overview.totalPurchases > 0
                ? fmt(
                    report.overview.totalCost /
                      report.overview.totalPurchases
                  )
                : fmt(0),
            icon: '📊',
            color: 'text-violet-700',
            bg: 'bg-violet-50 border-violet-200',
          },
        ].map(card => (
          <div
            key={card.label}
            className={`border rounded-xl p-5 ${card.bg}`}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">
                {card.label}
              </p>
              <span className="text-xl">{card.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function EmptyChart({ label = 'No data available' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-dashed border-slate-300">
      <div className="text-center">
        <span className="text-3xl block mb-1">📊</span>
        <p className="text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  );
}