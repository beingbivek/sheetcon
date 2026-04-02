// components/templates/inventory/SaleForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { Product, Customer, SaleItem } from './InventoryApp';

interface SaleFormProps {
  products: Product[];
  customers: Customer[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function SaleForm({ products, customers, onSubmit, onCancel, loading }: SaleFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<(SaleItem & { productStock: number })[]>([]);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [taxPercent, setTaxPercent] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * parseFloat(discountPercent || '0')) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * parseFloat(taxPercent || '0')) / 100;
  const total = taxableAmount + taxAmount;
  const amountDue = total - parseFloat(amountPaid || '0');

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const availableProducts = products.filter(p => 
    p.stock > 0 && !items.some(item => item.productId === p.id)
  );

  const addItem = (product: Product) => {
    setItems([...items, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.sellingPrice,
      discount: 0,
      total: product.sellingPrice,
      productStock: product.stock,
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    
    (item as any)[field] = value;
    
    // Validate quantity
    if (field === 'quantity') {
      item.quantity = Math.min(Math.max(1, parseInt(value) || 1), item.productStock);
    }
    
    // Recalculate total
    item.total = (item.quantity * item.unitPrice) - item.discount;
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    onSubmit({
      date: new Date().toISOString().split('T')[0],
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      })),
      discountPercent: parseFloat(discountPercent) || 0,
      taxPercent: parseFloat(taxPercent) || 0,
      paymentMethod,
      amountPaid: parseFloat(amountPaid) || 0,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Customer *
        </label>
        <div className="relative">
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 border border-slate-300 rounded-lg bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">{selectedCustomer.name}</p>
                {selectedCustomer.phone && (
                  <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search customer by name or phone..."
              />
              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDropdown(false);
                          setCustomerSearch('');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50"
                      >
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.phone && <p className="text-sm text-slate-500">{c.phone}</p>}
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-2 text-slate-500 text-sm">No customers found</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Items *
        </label>
        
        {/* Add Product */}
        <div className="mb-4">
          <select
            onChange={(e) => {
              const product = products.find(p => p.id === e.target.value);
              if (product) addItem(product);
              e.target.value = '';
            }}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">+ Add product...</option>
            {availableProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} - ₹{p.sellingPrice} ({p.stock} in stock)
              </option>
            ))}
          </select>
        </div>

        {/* Items Table */}
        {items.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium text-slate-700">Product</th>
                  <th className="text-center px-4 py-2 text-sm font-medium text-slate-700 w-24">Qty</th>
                  <th className="text-right px-4 py-2 text-sm font-medium text-slate-700 w-28">Price</th>
                  <th className="text-right px-4 py-2 text-sm font-medium text-slate-700 w-28">Discount</th>
                  <th className="text-right px-4 py-2 text-sm font-medium text-slate-700 w-28">Total</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">Stock: {item.productStock}</p>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="1"
                        max={item.productStock}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-right"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">
                      ₹{item.total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left - Discount & Tax */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tax %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                <option value="CREDIT">Credit (Pay Later)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount Paid (₹)
              </label>
              <input
                type="number"
                min="0"
                max={total}
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Max: ₹${total.toFixed(2)}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any notes..."
                rows={2}
              />
            </div>
          </div>

          {/* Right - Summary */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-4">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Tax ({taxPercent}%)</span>
                  <span>+₹{taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Amount Paid</span>
                <span>₹{(parseFloat(amountPaid) || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-orange-600 font-medium">
                <span>Amount Due</span>
                <span>₹{Math.max(0, amountDue).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || items.length === 0 || !selectedCustomer}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          Create Sale
        </button>
      </div>
    </form>
  );
}