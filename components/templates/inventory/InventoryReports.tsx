// components/templates/inventory/InventoryReports.tsx

'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  generateInventoryReportPDF, 
  generateSalesReportPDF, 
  downloadPDF 
} from '@/lib/pdf-generator';

interface InventoryReportsProps {
  report: any;
  canExportPdf: boolean;
  businessName?: string;
  products?: any[];
  sales?: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function InventoryReports({ 
  report, 
  canExportPdf,
  businessName = 'My Business',
  products = [],
  sales = []
}: InventoryReportsProps) {
  const [exportingInventory, setExportingInventory] = useState(false);
  const [exportingSales, setExportingSales] = useState(false);

  if (!report) {
    return (
      <div className="text-center py-12 text-slate-500">
        Loading reports...
      </div>
    );
  }

  const paymentMethodData = Object.entries(report.salesByPaymentMethod || {}).map(
    ([method, data]: [string, any]) => ({
      name: method,
      count: data.count,
      amount: data.amount,
    })
  );

  const paymentStatusData = Object.entries(report.salesByStatus || {}).map(
    ([status, data]: [string, any]) => ({
      name: status,
      count: data.count,
      amount: data.amount,
    })
  );

  const handleExportInventory = async () => {
    if (!canExportPdf) {
      alert('PDF export is not available on your current plan. Please upgrade to access this feature.');
      return;
    }

    setExportingInventory(true);
    try {
      // Use products from report if available
      const productList = report.lowStockProducts?.concat(report.outOfStockProducts || []) || products;
      const blob = await generateInventoryReportPDF(businessName, products.length > 0 ? products : productList);
      downloadPDF(blob, `inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExportingInventory(false);
    }
  };

  const handleExportSales = async () => {
    if (!canExportPdf) {
      alert('PDF export is not available on your current plan. Please upgrade to access this feature.');
      return;
    }

    setExportingSales(true);
    try {
      const currentMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      // Use recentSales from report if sales not provided
      const salesList = sales.length > 0 ? sales : (report.recentSales || []);
      const blob = await generateSalesReportPDF(businessName, currentMonth, salesList);
      downloadPDF(blob, `sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExportingSales(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleExportInventory}
          disabled={exportingInventory || !canExportPdf}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            canExportPdf
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          {exportingInventory ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              📦 Export Inventory Report
              {!canExportPdf && <span className="text-xs">(Pro)</span>}
            </>
          )}
        </button>
        <button
          onClick={handleExportSales}
          disabled={exportingSales || !canExportPdf}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            canExportPdf
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          {exportingSales ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              🧾 Export Sales Report
              {!canExportPdf && <span className="text-xs">(Pro)</span>}
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Products</p>
          <p className="text-2xl font-bold text-slate-900">{report.totalProducts}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Customers</p>
          <p className="text-2xl font-bold text-slate-900">{report.totalCustomers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{(report.totalRevenue || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pending Dues</p>
          <p className="text-2xl font-bold text-orange-600">
            ₹{(report.totalDue || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Monthly Sales Trend</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.monthlySales || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Sales by Payment Method</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products & Payment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Top Selling Products</h3>
          {report.topProducts && report.topProducts.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.topProducts.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="productName" type="category" width={120} />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-12">No sales data yet</p>
          )}
        </div>

        {/* Payment Status Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Payment Status</h3>
          <div className="space-y-4">
            {paymentStatusData.map((status, index) => (
              <div key={status.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-700">{status.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    ₹{status.amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-slate-500">{status.count} invoices</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
          <h3 className="font-semibold text-yellow-900 mb-4">⚠️ Low Stock Products</h3>
          {report.lowStockProducts && report.lowStockProducts.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {report.lowStockProducts.map((product: any) => (
                <div key={product.id} className="flex justify-between items-center bg-white rounded-lg p-3">
                  <div>
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">Min: {product.minStock}</p>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {product.stock} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-yellow-700">All products are well stocked! 👍</p>
          )}
        </div>

        {/* Out of Stock */}
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h3 className="font-semibold text-red-900 mb-4">🚫 Out of Stock Products</h3>
          {report.outOfStockProducts && report.outOfStockProducts.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {report.outOfStockProducts.map((product: any) => (
                <div key={product.id} className="bg-white rounded-lg p-3">
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-sm text-red-600">Out of stock</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-700">No out of stock items! ✅</p>
          )}
        </div>
      </div>

      {/* Stock Value */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Total Inventory Value</h3>
            <p className="text-sm text-slate-500">Based on cost price × current stock</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            ₹{(report.stockValue || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </div>
  );
}