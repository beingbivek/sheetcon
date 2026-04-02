// components/templates/inventory/ProductList.tsx

'use client';

import { useState } from 'react';
import { Product } from './InventoryApp';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export default function ProductList({ products, onEdit, onDelete }: ProductListProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesStock = stockFilter === 'all' ||
                        (stockFilter === 'low' && p.stock > 0 && p.stock <= p.minStock) ||
                        (stockFilter === 'out' && p.stock <= 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Stock Levels</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Product</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">SKU</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Category</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Cost</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Price</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Stock</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-slate-500 truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      {product.sku || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {product.category && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {product.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      ₹{product.costPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      ₹{product.sellingPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        product.stock <= 0
                          ? 'bg-red-100 text-red-700'
                          : product.stock <= product.minStock
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {product.stock} {product.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onDelete(product.id)}
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
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center text-sm text-slate-600">
        <span>Showing {filteredProducts.length} of {products.length} products</span>
        <span>
          Total Stock Value: ₹{filteredProducts.reduce((sum, p) => sum + (p.stock * p.costPrice), 0).toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}