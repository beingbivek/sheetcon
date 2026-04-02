// components/templates/inventory/ProductForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { Product } from './InventoryApp';

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProductForm({ product, onSubmit, onCancel, loading }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    minStock: '5',
    unit: 'pcs',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        category: product.category,
        description: product.description,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        unit: product.unit,
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sellingPrice) {
      alert('Name and selling price are required');
      return;
    }

    onSubmit({
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      description: formData.description,
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      stock: parseInt(formData.stock) || 0,
      minStock: parseInt(formData.minStock) || 5,
      unit: formData.unit,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter product name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            SKU
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., PRD-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Category
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Electronics"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Product description..."
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cost Price (₹)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.costPrice}
            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Selling Price (₹) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.sellingPrice}
            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Current Stock
          </label>
          <input
            type="number"
            min="0"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Min. Stock Alert
          </label>
          <input
            type="number"
            min="0"
            value={formData.minStock}
            onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Unit
          </label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pcs">Pieces (pcs)</option>
            <option value="kg">Kilograms (kg)</option>
            <option value="g">Grams (g)</option>
            <option value="l">Liters (l)</option>
            <option value="ml">Milliliters (ml)</option>
            <option value="m">Meters (m)</option>
            <option value="box">Box</option>
            <option value="pack">Pack</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
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
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {product ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}