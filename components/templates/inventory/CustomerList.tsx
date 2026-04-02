// components/templates/inventory/CustomerList.tsx

'use client';

import { useState } from 'react';
import { Customer, Sale } from './InventoryApp';

interface CustomerListProps {
  customers: Customer[];
  sales: Sale[];
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
}

export default function CustomerList({ customers, sales, onEdit, onDelete }: CustomerListProps) {
  const [search, setSearch] = useState('');

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerStats = (customerId: string) => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    return {
      totalPurchases: customerSales.length,
      totalSpent: customerSales.reduce((sum, s) => sum + s.total, 0),
      totalDue: customerSales.reduce((sum, s) => sum + s.amountDue, 0),
    };
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => {
            const stats = getCustomerStats(customer.id);
            return (
              <div
                key={customer.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                      {customer.city && (
                        <p className="text-sm text-slate-500">{customer.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(customer)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(customer.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📱</span>
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>✉️</span>
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📍</span>
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{stats.totalPurchases}</p>
                    <p className="text-xs text-slate-500">Orders</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-600">
                      ₹{stats.totalSpent.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-500">Spent</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-orange-600">
                      ₹{stats.totalDue.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-500">Due</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 text-slate-500">
            No customers found
          </div>
        )}
      </div>
    </div>
  );
}