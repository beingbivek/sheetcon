// components/templates/inventory/InventoryDashboard.tsx

'use client';

import { Product, Customer, Sale } from './InventoryApp';

interface InventoryDashboardProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  report: any;
  onViewProducts: () => void;
  onViewSales: () => void;
  onNewSale: () => void;
}

export default function InventoryDashboard({
  products,
  customers,
  sales,
  report,
  onViewProducts,
  onViewSales,
  onNewSale,
}: InventoryDashboardProps) {
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  const outOfStockProducts = products.filter(p => p.stock <= 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalDue = sales.reduce((sum, s) => sum + s.amountDue, 0);
  const recentSales = [...sales].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">📦</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Products
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{products.length}</p>
          <p className="text-sm text-slate-600 mt-1">Total Products</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">👥</span>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              Customers
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{customers.length}</p>
          <p className="text-sm text-slate-600 mt-1">Total Customers</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">💰</span>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
              Revenue
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-600 mt-1">Total Sales</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">📊</span>
            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Stock Value
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ₹{totalStockValue.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-600 mt-1">Inventory Worth</p>
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <h3 className="font-semibold text-yellow-900">Low Stock Alert</h3>
          </div>
          {lowStockProducts.length > 0 ? (
            <ul className="space-y-2">
              {lowStockProducts.slice(0, 5).map(p => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span className="text-yellow-800">{p.name}</span>
                  <span className="font-medium text-yellow-900">{p.stock} left</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-yellow-700 text-sm">All products well stocked! 👍</p>
          )}
          {lowStockProducts.length > 5 && (
            <button
              onClick={onViewProducts}
              className="mt-3 text-yellow-700 text-sm hover:underline"
            >
              View all {lowStockProducts.length} items →
            </button>
          )}
        </div>

        {/* Out of Stock */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🚫</span>
            <h3 className="font-semibold text-red-900">Out of Stock</h3>
          </div>
          {outOfStockProducts.length > 0 ? (
            <ul className="space-y-2">
              {outOfStockProducts.slice(0, 5).map(p => (
                <li key={p.id} className="text-sm text-red-800">
                  {p.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-red-700 text-sm">No out of stock items! ✅</p>
          )}
        </div>

        {/* Pending Payments */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💳</span>
            <h3 className="font-semibold text-orange-900">Pending Payments</h3>
          </div>
          <p className="text-3xl font-bold text-orange-900">
            ₹{totalDue.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-orange-700 mt-1">
            From {sales.filter(s => s.paymentStatus !== 'PAID').length} invoices
          </p>
        </div>
      </div>

      {/* Quick Actions & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={onNewSale}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <span>🧾</span> New Sale
            </button>
            <button
              onClick={onViewProducts}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <span>📦</span> Manage Products
            </button>
            <button
              onClick={onViewSales}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <span>📋</span> View All Sales
            </button>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Recent Sales</h3>
            <button
              onClick={onViewSales}
              className="text-blue-600 text-sm hover:underline"
            >
              View all →
            </button>
          </div>
          {recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-sm font-medium text-slate-600">Invoice</th>
                    <th className="text-left py-2 text-sm font-medium text-slate-600">Customer</th>
                    <th className="text-right py-2 text-sm font-medium text-slate-600">Amount</th>
                    <th className="text-center py-2 text-sm font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(sale => (
                    <tr key={sale.id} className="border-b border-slate-50">
                      <td className="py-3 text-sm font-medium text-slate-900">
                        {sale.invoiceNumber}
                      </td>
                      <td className="py-3 text-sm text-slate-600">{sale.customerName}</td>
                      <td className="py-3 text-sm text-right font-medium text-slate-900">
                        ₹{sale.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded ${
                          sale.paymentStatus === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : sale.paymentStatus === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {sale.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No sales yet. Create your first sale!</p>
          )}
        </div>
      </div>
    </div>
  );
}