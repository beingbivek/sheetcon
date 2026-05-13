// app/dashboard/sheets/[id]/business/BusinessApp.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import BusinessSetup from './components/BusinessSetup';
import SuppliersModule from './components/SuppliersModule';
import ProductsModule from './components/ProductsModule';
import CustomersModule from './components/CustomersModule';
import PurchasesModule from './components/PurchasesModule';
import SalesModule from './components/SalesModule';
import ReportsModule from './components/ReportsModule';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BusinessConfig {
  businessName: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  currency: string;
  currencySymbol: string;
  paymentQrUrl: string;
  invoicePrefix: string;
  invoiceFooter: string;
  lowStockThreshold: string;
}

export interface Connection {
  id: string;
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    tier: {
      name: string;
      maxCrudPerDay: number;
    };
  };
}

// ─── Nav config ───────────────────────────────────────────────────────────────

type ModuleId =
  | 'dashboard'
  | 'suppliers'
  | 'products'
  | 'customers'
  | 'purchases'
  | 'sales'
  | 'reports';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    description: 'Business overview',
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    description: 'Manage suppliers & parties',
  },
  {
    id: 'products',
    label: 'Products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    description: 'Products & inventory',
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    description: 'Customer management',
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    description: 'Import & purchase orders',
  },
  {
    id: 'sales',
    label: 'Sales / POS',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Point of sale & billing',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    description: 'Analytics & reports',
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface BusinessAppProps {
  connection: Connection;
  initialConfig: Record<string, string>;
  setupRequired: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusinessApp({
  connection,
  initialConfig,
  setupRequired,
}: BusinessAppProps) {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [config, setConfig] = useState<BusinessConfig>({
    businessName: initialConfig.businessName ?? '',
    logoUrl: initialConfig.logoUrl ?? '',
    address: initialConfig.address ?? '',
    phone: initialConfig.phone ?? '',
    email: initialConfig.email ?? '',
    website: initialConfig.website ?? '',
    taxNumber: initialConfig.taxNumber ?? '',
    currency: initialConfig.currency ?? 'NPR',
    currencySymbol: initialConfig.currencySymbol ?? 'Rs.',
    paymentQrUrl: initialConfig.paymentQrUrl ?? '',
    invoicePrefix: initialConfig.invoicePrefix ?? 'INV',
    invoiceFooter: initialConfig.invoiceFooter ?? 'Thank you for your business!',
    lowStockThreshold: initialConfig.lowStockThreshold ?? '5',
  });
  const [showSetup, setShowSetup] = useState(setupRequired);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncError, setSyncError] = useState('');

  const handleManualSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncError('');
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/resync`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (data.success) {
        setLastSynced(new Date().toLocaleTimeString());
        // Force refresh current module by briefly toggling
        setActiveModule(prev => prev);
      } else {
        setSyncError(data.error ?? 'Sync failed');
      }
    } catch {
      setSyncError('Network error during sync');
    } finally {
      setSyncing(false);
    }
  }, [connection.id, syncing]);

  const fmt = useCallback(
    (amount: number) =>
      `${config.currencySymbol} ${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [config.currencySymbol]
  );

  const handleConfigSaved = (newConfig: BusinessConfig) => {
    setConfig(newConfig);
    setShowSetup(false);
  };

  const renderModule = () => {
    const commonProps = { connection, config, fmt };
    switch (activeModule) {
      case 'dashboard':
        return (
          <DashboardOverview
            {...commonProps}
            onNavigate={setActiveModule}
            onLowStockCount={setLowStockCount}
          />
        );
      case 'suppliers':
        return <SuppliersModule {...commonProps} />;
      case 'products':
        return <ProductsModule {...commonProps} />;
      case 'customers':
        return <CustomersModule {...commonProps} />;
      case 'purchases':
        return <PurchasesModule {...commonProps} />;
      case 'sales':
        return <SalesModule {...commonProps} />;
      case 'reports':
        return <ReportsModule {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Logo */}
          <div className="p-4 border-b border-slate-200 flex items-center gap-3">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="logo"
                className="w-10 h-10 rounded-lg object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {config.businessName.charAt(0).toUpperCase() || 'B'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">
                {config.businessName || 'My Business'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {connection.user.tier.name} Plan
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors relative group ${activeModule === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span
                  className={
                    activeModule === item.id ? 'text-blue-600' : 'text-slate-400'
                  }
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
                {item.id === 'products' && lowStockCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {lowStockCount > 9 ? '9+' : lowStockCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 space-y-2">
            <button
              onClick={() => setShowSetup(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Business Settings
            </button>
            <a
              href={connection.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Sheet
            </a>
            <a
              href="/dashboard"
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Back to Dashboard
            </a>
          </div>
        </aside>
      </>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900">
              {NAV_ITEMS.find(n => n.id === activeModule)?.label}
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              {NAV_ITEMS.find(n => n.id === activeModule)?.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync error */}
            {syncError && (
              <span className="hidden sm:block text-xs text-red-500 max-w-[140px] truncate">
                {syncError}
              </span>
            )}

            {/* Last synced indicator */}
            {lastSynced && !syncing && (
              <span className="hidden sm:block text-xs text-slate-400">
                Synced {lastSynced}
              </span>
            )}

            {/* Manual sync button */}
            <button
              onClick={handleManualSync}
              disabled={syncing}
              title="Sync with Google Sheets"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
        ${syncing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
            >
              <svg
                className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Syncing...' : 'Sync'}
            </button>

            {/* Low stock warning */}
            {lowStockCount > 0 && (
              <button
                onClick={() => setActiveModule('products')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd" />
                </svg>
                {lowStockCount} Low Stock
              </button>
            )}

            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold">
              {connection.user.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        {/* Module content */}
        <main className="flex-1 overflow-y-auto">
          {renderModule()}
        </main>
      </div>

      {/* ── Setup Modal ── */}
      {showSetup && (
        <BusinessSetup
          connection={connection}
          currentConfig={config}
          onSaved={handleConfigSaved}
          onClose={setupRequired ? undefined : () => setShowSetup(false)}
        />
      )}
    </div>
  );
}

// ─── Dashboard Overview (inline) ──────────────────────────────────────────────

interface DashboardOverviewProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
  onNavigate: (m: ModuleId) => void;
  onLowStockCount: (n: number) => void;
}

interface ReportData {
  overview: {
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
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    totalQty: number;
    totalRevenue: number;
  }>;
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string | null;
    total: number;
    status: string;
    createdAt: string;
  }>;
  salesByDate: Array<{ date: string; revenue: number; orders: number }>;
}

function DashboardOverview({
  connection,
  config,
  fmt,
  onNavigate,
  onLowStockCount,
}: DashboardOverviewProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/user/sheets/${connection.id}/business/reports`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.success) {
          setReport(d.report);
          onLowStockCount(d.report.overview.lowStockCount ?? 0);
        } else {
          setError(d.error ?? 'Failed to load report');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load report');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [connection.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading overview...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-600 font-medium mb-1">Failed to load dashboard</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const ov = report.overview;

  const statCards = [
    {
      label: 'Total Revenue',
      value: fmt(ov.totalRevenue),
      icon: '💰',
      color: 'bg-emerald-50 text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      label: 'Gross Profit',
      value: fmt(ov.grossProfit),
      sub: `${ov.grossMargin.toFixed(1)}% margin`,
      icon: '📈',
      color: 'bg-blue-50 text-blue-700',
      border: 'border-blue-200',
    },
    {
      label: 'Total Purchases',
      value: fmt(ov.totalCost),
      sub: `${ov.totalPurchases} orders`,
      icon: '🛒',
      color: 'bg-violet-50 text-violet-700',
      border: 'border-violet-200',
    },
    {
      label: 'Total Sales',
      value: String(ov.totalSales),
      sub: 'invoices generated',
      icon: '🧾',
      color: 'bg-amber-50 text-amber-700',
      border: 'border-amber-200',
    },
    {
      label: 'Customers',
      value: String(ov.totalCustomers),
      icon: '👥',
      color: 'bg-pink-50 text-pink-700',
      border: 'border-pink-200',
    },
    {
      label: 'Products',
      value: String(ov.totalProducts),
      sub: ov.lowStockCount > 0 ? `⚠️ ${ov.lowStockCount} low stock` : 'all stocked',
      icon: '📦',
      color: ov.lowStockCount > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700',
      border: ov.lowStockCount > 0 ? 'border-red-200' : 'border-slate-200',
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Welcome back 👋
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Here's what's happening with{' '}
          <span className="font-medium text-slate-700">
            {config.businessName || 'your business'}
          </span>{' '}
          today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(card => (
          <div
            key={card.label}
            className={`bg-white rounded-xl border ${card.border} p-4`}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {card.label}
              </p>
              <span className="text-xl">{card.icon}</span>
            </div>
            <p className={`text-lg font-bold ${card.color.split(' ')[1]}`}>
              {card.value}
            </p>
            {card.sub && (
              <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Sale', module: 'sales' as ModuleId, icon: '🧾', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
            { label: 'New Purchase', module: 'purchases' as ModuleId, icon: '🛒', color: 'bg-violet-600 hover:bg-violet-700 text-white' },
            { label: 'Add Product', module: 'products' as ModuleId, icon: '📦', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
            { label: 'View Reports', module: 'reports' as ModuleId, icon: '📊', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.module)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${action.color}`}
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Recent Sales
            </h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          {report.recentSales.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No sales yet. Create your first sale!
            </div>
          ) : (
            <div className="space-y-3">
              {report.recentSales.slice(0, 5).map(sale => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
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
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${sale.status === 'PAID'
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

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Top Products
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-blue-600 hover:underline"
            >
              Full report →
            </button>
          </div>
          {report.topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No sales data yet.
            </div>
          ) : (
            <div className="space-y-3">
              {report.topProducts.slice(0, 5).map((product, idx) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0
                      ? 'bg-amber-100 text-amber-700'
                      : idx === 1
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-orange-50 text-orange-600'
                      }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {product.productName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {product.totalQty} units sold
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {fmt(product.totalRevenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}