// components/templates/inventory/InventoryApp.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import InventoryDashboard from './InventoryDashboard';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import CustomerList from './CustomerList';
import CustomerForm from './CustomerForm';
import SalesList from './SalesList';
import SaleForm from './SaleForm';
import InvoiceView from './InvoiceView';
import InventoryReports from './InventoryReports';

interface InventoryAppProps {
  connection: {
    id: string;
    spreadsheetName: string;
    spreadsheetId: string;
    spreadsheetUrl: string;
  };
  user: {
    tier: {
      exportToPdf: boolean;
      maxCrudPerDay: number;
    };
    crudCountToday: number;
  };
}

type View = 'dashboard' | 'products' | 'customers' | 'sales' | 'reports';
type ModalType = 'product' | 'customer' | 'sale' | 'invoice' | null;

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'CASH' | 'WALLET' | 'BANK' | 'CREDIT';
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  amountPaid: number;
  amountDue: number;
  notes: string;
  createdAt: string;
  items: SaleItem[];
}

export default function InventoryApp({ connection, user }: InventoryAppProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [report, setReport] = useState<any>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [productsRes, customersRes, salesRes] = await Promise.all([
        fetch(`/api/user/sheets/${connection.id}/products`),
        fetch(`/api/user/sheets/${connection.id}/customers`),
        fetch(`/api/user/sheets/${connection.id}/sales`),
      ]);

      if (!productsRes.ok || !customersRes.ok || !salesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [productsData, customersData, salesData] = await Promise.all([
        productsRes.json(),
        customersRes.json(),
        salesRes.json(),
      ]);

      setProducts(productsData.products || []);
      setCustomers(customersData.customers || []);
      setSales(salesData.sales || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/reports`);
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    }
  }, [connection.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (currentView === 'reports' || currentView === 'dashboard') {
      fetchReport();
    }
  }, [currentView, fetchReport]);

  // Product handlers
  const handleAddProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add product');
      }

      await fetchData();
      setModalType(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProduct = async (productId: string, updates: Partial<Product>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update product');
      }

      await fetchData();
      setModalType(null);
      setEditingItem(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Customer handlers
  const handleAddCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add customer');
      }

      await fetchData();
      setModalType(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update customer');
      }

      await fetchData();
      setModalType(null);
      setEditingItem(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Sale handlers
  const handleCreateSale = async (saleData: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create sale');
      }

      const data = await res.json();
      await fetchData();
      setModalType(null);
      
      // Show invoice
      setSelectedSale(data.sale);
      setModalType('invoice');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePayment = async (saleId: string, amountPaid: number, paymentMethod: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaid, paymentMethod }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update payment');
      }

      await fetchData();
      setModalType(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Are you sure you want to delete this sale? Stock will be restored.')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/sheets/${connection.id}/sales/${saleId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete sale');
      }

      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditProduct = (product: Product) => {
    setEditingItem(product);
    setModalType('product');
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingItem(customer);
    setModalType('customer');
  };

  const viewInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setModalType('invoice');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setSelectedSale(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 mt-4">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            📦 {connection.spreadsheetName}
          </h1>
          <p className="text-slate-600">Small Business Inventory Manager</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={connection.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg text-sm"
          >
            Open Sheet ↗
          </a>
          {currentView === 'products' && (
            <button
              onClick={() => { setEditingItem(null); setModalType('product'); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              + Add Product
            </button>
          )}
          {currentView === 'customers' && (
            <button
              onClick={() => { setEditingItem(null); setModalType('customer'); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              + Add Customer
            </button>
          )}
          {currentView === 'sales' && (
            <button
              onClick={() => setModalType('sale')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              + New Sale
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-8">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: '📊' },
            { key: 'products', label: 'Products', icon: '📦' },
            { key: 'customers', label: 'Customers', icon: '👥' },
            { key: 'sales', label: 'Sales', icon: '🧾' },
            { key: 'reports', label: 'Reports', icon: '📈' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCurrentView(tab.key as View)}
              className={`pb-4 border-b-2 transition-colors flex items-center gap-2 ${
                currentView === tab.key
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {currentView === 'dashboard' && (
        <InventoryDashboard
          products={products}
          customers={customers}
          sales={sales}
          report={report}
          onViewProducts={() => setCurrentView('products')}
          onViewSales={() => setCurrentView('sales')}
          onNewSale={() => setModalType('sale')}
        />
      )}

      {currentView === 'products' && (
        <ProductList
          products={products}
          onEdit={openEditProduct}
          onDelete={handleDeleteProduct}
        />
      )}

      {currentView === 'customers' && (
        <CustomerList
          customers={customers}
          sales={sales}
          onEdit={openEditCustomer}
          onDelete={handleDeleteCustomer}
        />
      )}

      {currentView === 'sales' && (
        <SalesList
          sales={sales}
          onViewInvoice={viewInvoice}
          onUpdatePayment={handleUpdatePayment}
          onDelete={handleDeleteSale}
        />
      )}

      {currentView === 'reports' && (
        <InventoryReports
          report={report}
          canExportPdf={user.tier.exportToPdf}
        />
      )}

      {/* Modals */}
      {modalType === 'product' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                {editingItem ? 'Edit Product' : 'Add Product'}
              </h3>
              <ProductForm
                product={editingItem}
                onSubmit={editingItem 
                  ? (data) => handleUpdateProduct(editingItem.id, data)
                  : handleAddProduct
                }
                onCancel={closeModal}
                loading={actionLoading}
              />
            </div>
          </div>
        </div>
      )}

      {modalType === 'customer' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                {editingItem ? 'Edit Customer' : 'Add Customer'}
              </h3>
              <CustomerForm
                customer={editingItem}
                onSubmit={editingItem
                  ? (data) => handleUpdateCustomer(editingItem.id, data)
                  : handleAddCustomer
                }
                onCancel={closeModal}
                loading={actionLoading}
              />
            </div>
          </div>
        </div>
      )}

      {modalType === 'sale' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Create New Sale
              </h3>
              <SaleForm
                products={products}
                customers={customers}
                onSubmit={handleCreateSale}
                onCancel={closeModal}
                loading={actionLoading}
              />
            </div>
          </div>
        </div>
      )}

      {modalType === 'invoice' && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <InvoiceView
              sale={selectedSale}
              businessName={connection.spreadsheetName}
              onClose={closeModal}
              canExportPdf={user.tier.exportToPdf}
            />
          </div>
        </div>
      )}
    </div>
  );
}