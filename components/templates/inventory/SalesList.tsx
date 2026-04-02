// components/templates/inventory/SalesList.tsx

'use client';

import { useState } from 'react';
import { Sale } from './InventoryApp';

interface SalesListProps {
  sales: Sale[];
  onViewInvoice: (sale: Sale) => void;
  onUpdatePayment: (saleId: string, amount: number, method: string) => void;
  onDelete: (saleId: string) => void;
}

export default function SalesList({ sales, onViewInvoice, onUpdatePayment, onDelete }: SalesListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentModal, setPaymentModal] = useState<{ saleId: string; amountDue: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const filteredSales = sales
    .filter(s => {
      const matchesSearch = s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                           s.customerName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || s.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handlePaymentSubmit = () => {
    if (!paymentModal || !paymentAmount) return;
    onUpdatePayment(paymentModal.saleId, parseFloat(paymentAmount), paymentMethod);
    setPaymentModal(null);
    setPaymentAmount('');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by invoice or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Invoice</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Customer</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Total</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Paid</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Due</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Payment</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onViewInvoice(sale)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {sale.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(sale.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{sale.customerName}</p>
                        {sale.customerPhone && (
                          <p className="text-sm text-slate-500">{sale.customerPhone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      ₹{sale.total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600">
                      ₹{sale.amountPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right text-orange-600 font-medium">
                      ₹{sale.amountDue.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        sale.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : sale.paymentStatus === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${
                        sale.paymentMethod === 'CASH' ? 'bg-green-50 text-green-600' :
                        sale.paymentMethod === 'BANK' ? 'bg-blue-50 text-blue-600' :
                        sale.paymentMethod === 'WALLET' ? 'bg-purple-50 text-purple-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onViewInvoice(sale)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View Invoice"
                        >
                          👁️
                        </button>
                        {sale.paymentStatus !== 'PAID' && (
                          <button
                            onClick={() => setPaymentModal({ saleId: sale.id, amountDue: sale.amountDue })}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Record Payment"
                          >
                            💰
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(sale.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No sales found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount Due: ₹{paymentModal.amountDue.toLocaleString('en-IN')}
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={paymentModal.amountDue}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount received"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="WALLET">Digital Wallet (UPI, etc)</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}