// app/dashboard/sheets/[id]/business/BusinessApp.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import SalesModule from "./components/SalesModule";
import OrdersModule from "./components/OrdersModule";
import ProductsModule from "./components/ProductsModule";
import ReturnsModule from "./components/ReturnsModule";
import SuppliersModule from "./components/SuppliersModule";
import CustomersModule from "./components/CustomersModule";
import PurchasesModule from "./components/PurchasesModule";
import ReportsModule from "./components/ReportsModule";
import BusinessSetup from "./components/BusinessSetup";

// ── Types ────────────────────────────────────────────────────────────────────

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
  defaultTaxRate: string;  // ← TASK 5
}

export interface Connection {
  id: string;
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    tier: { name: string; maxCrudPerDay: number };
  };
}

type ModuleId =
  | "dashboard"
  | "suppliers"
  | "products"
  | "customers"
  | "purchases"
  | "sales"
  | "orders"
  | "returns"
  | "reports";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",  label: "Dashboard",     icon: "📊", description: "Overview & KPIs" },
  { id: "sales",      label: "Sales / POS",   icon: "🧾", description: "Walk-in & online sales" },
  { id: "orders",     label: "Online Orders", icon: "📦", description: "Manage online orders" },
  { id: "products",   label: "Products",      icon: "🏷️", description: "Inventory & catalog" },
  { id: "customers",  label: "Customers",     icon: "👥", description: "Customer records" },
  { id: "purchases",  label: "Purchases",     icon: "🛒", description: "Stock purchases" },
  { id: "suppliers",  label: "Suppliers",     icon: "🏭", description: "Supplier management" },
  { id: "returns",    label: "Returns",       icon: "↩️", description: "Customer & supplier returns" },
  { id: "reports",    label: "Reports",       icon: "📈", description: "Analytics & reports" },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  connection: Connection;
  initialConfig: Record<string, string>;
}

// ── Dashboard Overview ───────────────────────────────────────────────────────

interface OverviewProps {
  connection: Connection;
  config: BusinessConfig;
  fmt: (n: number) => string;
  onNavigate: (m: ModuleId) => void;
  onLowStockCount: (n: number) => void;
}

function DashboardOverview({
  connection,
  fmt,
  onNavigate,
  onLowStockCount,
}: OverviewProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/sheets/${connection.id}/business/reports`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setReport(d.report);
          onLowStockCount(d.report?.overview?.lowStockCount ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, [connection.id, onLowStockCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-3">⏳</div>
          <p className="text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const ov = report?.overview ?? {};

  const kpis = [
    { label: "Total Revenue",   value: fmt(ov.totalRevenue ?? 0),   icon: "💰", color: "text-emerald-600" },
    { label: "Gross Profit",    value: fmt(ov.grossProfit ?? 0),    icon: "📈", color: "text-blue-600" },
    { label: "Total Sales",     value: String(ov.totalSales ?? 0),  icon: "🧾", color: "text-violet-600" },
    { label: "Low Stock Items", value: String(ov.lowStockCount ?? 0), icon: "⚠️", color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{k.icon}</span>
              <span className="text-xs text-slate-500 font-medium">{k.label}</span>
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "New Sale",      icon: "🧾", module: "sales"     as ModuleId },
            { label: "New Purchase",  icon: "🛒", module: "purchases" as ModuleId },
            { label: "Add Product",   icon: "🏷️", module: "products"  as ModuleId },
            { label: "View Reports",  icon: "📈", module: "reports"   as ModuleId },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate(a.module)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-all text-slate-700 text-sm font-medium"
            >
              <span className="text-2xl">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Sales */}
      {report?.recentSales?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Recent Sales</h3>
            <button
              onClick={() => onNavigate("sales")}
              className="text-xs text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {report.recentSales.slice(0, 5).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">{s.customerName ?? "Walk-in"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">{fmt(s.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.status === "PAID"    ? "bg-emerald-100 text-emerald-700" :
                    s.status === "PARTIAL" ? "bg-amber-100 text-amber-700"    :
                                             "bg-red-100 text-red-700"
                  }`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BusinessApp({ connection, initialConfig }: Props) {
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [config, setConfig] = useState<BusinessConfig>({
    businessName:      initialConfig.businessName      ?? "",
    logoUrl:           initialConfig.logoUrl           ?? "",
    address:           initialConfig.address           ?? "",
    phone:             initialConfig.phone             ?? "",
    email:             initialConfig.email             ?? "",
    website:           initialConfig.website           ?? "",
    taxNumber:         initialConfig.taxNumber         ?? "",
    currency:          initialConfig.currency          ?? "NPR",
    currencySymbol:    initialConfig.currencySymbol    ?? "Rs.",
    paymentQrUrl:      initialConfig.paymentQrUrl      ?? "",
    invoicePrefix:     initialConfig.invoicePrefix     ?? "INV",
    invoiceFooter:     initialConfig.invoiceFooter     ?? "",
    lowStockThreshold: initialConfig.lowStockThreshold ?? "5",
    defaultTaxRate:    initialConfig.defaultTaxRate    ?? "0",   // ← TASK 5
  });
  const [showSetup, setShowSetup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fmt = useCallback(
    (amount: number) =>
      `${config.currencySymbol || "Rs."} ${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [config.currencySymbol],
  );

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(
        `/api/user/sheets/${connection.id}/business/resync`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Sync failed");
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleConfigSaved = (newConfig: BusinessConfig) => {
    setConfig(newConfig);
    setShowSetup(false);
  };

  const handleLowStockCount = useCallback((n: number) => {
    setLowStockCount(n);
  }, []);

  const commonProps = { connection, config, fmt };

  function renderModule() {
    switch (activeModule) {
      case "dashboard":
        return (
          <DashboardOverview
            {...commonProps}
            onNavigate={setActiveModule}
            onLowStockCount={handleLowStockCount}
          />
        );
      case "sales":
        return <SalesModule {...commonProps} />;
      case "orders":
        return <OrdersModule {...commonProps} />;
      case "products":
        return <ProductsModule {...commonProps} />;
      case "customers":
        return <CustomersModule {...commonProps} />;
      case "purchases":
        return <PurchasesModule {...commonProps} />;
      case "suppliers":
        return <SuppliersModule {...commonProps} />;
      case "returns":
        return <ReturnsModule {...commonProps} />;
      case "reports":
        return <ReportsModule {...commonProps} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Business header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="logo"
                className="w-9 h-9 rounded-lg object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {(config.businessName || "B").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {config.businessName || "My Business"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {connection.spreadsheetName}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveModule(item.id);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                transition-colors mb-0.5 group
                ${activeModule === item.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }
              `}
            >
              <span className="text-base flex-shrink-0 relative">
                {item.icon}
                {item.id === "products" && lowStockCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {lowStockCount > 9 ? "9+" : lowStockCount}
                  </span>
                )}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-slate-200 space-y-2">
          <button
            onClick={() => setShowSetup(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm transition-colors"
          >
            <span>⚙️</span> Business Settings
          </button>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm transition-colors disabled:opacity-50"
          >
            <span>{syncing ? "⏳" : "🔄"}</span>
            {syncing ? "Syncing…" : "Sync to Sheet"}
          </button>
          {lastSynced && (
            <p className="text-xs text-slate-400 text-center">
              Last synced: {lastSynced}
            </p>
          )}
          {syncError && (
            <p className="text-xs text-red-500 text-center">{syncError}</p>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            ☰
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-800">
              {NAV_ITEMS.find((n) => n.id === activeModule)?.label}
            </h1>
            <p className="text-xs text-slate-500">
              {NAV_ITEMS.find((n) => n.id === activeModule)?.description}
            </p>
          </div>
          <a
            href={connection.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <span>📊</span> Open Sheet
          </a>
        </header>

        {/* Module content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderModule()}
        </main>
      </div>

      {/* Setup modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <BusinessSetup
              connection={connection}
              currentConfig={config}
              onSaved={handleConfigSaved}
              onClose={() => setShowSetup(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}