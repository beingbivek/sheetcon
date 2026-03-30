// components/templates/finance/FinanceApp.tsx

'use client';

import { useState, useEffect } from 'react';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import FinanceDashboard from './FinanceDashboard';
import MonthlyReport from './MonthlyReport';

interface FinanceAppProps {
  connection: {
    id: string;
    spreadsheetName: string;
    spreadsheetId: string;
  };
  user: {
    tier: {
      exportToPdf: boolean;
    };
  };
}

type View = 'dashboard' | 'transactions' | 'reports';

export default function FinanceApp({ connection, user }: FinanceAppProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/sheets/${connection.id}/data`);
      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async (transaction: any) => {
    try {
      const response = await fetch(`/api/user/sheets/${connection.id}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      if (response.ok) {
        await fetchTransactions();
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const handleUpdateTransaction = async (id: string, transaction: any) => {
    try {
      const response = await fetch(`/api/user/sheets/${connection.id}/data/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      if (response.ok) {
        await fetchTransactions();
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await fetch(`/api/user/sheets/${connection.id}/data/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTransactions();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">💰 {connection.spreadsheetName}</h1>
          <p className="text-slate-600">Personal Finance Tracker</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Add Transaction
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`pb-4 border-b-2 transition-colors ${
              currentView === 'dashboard'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('transactions')}
            className={`pb-4 border-b-2 transition-colors ${
              currentView === 'transactions'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            className={`pb-4 border-b-2 transition-colors ${
              currentView === 'reports'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Reports
          </button>
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 mt-4">Loading transactions...</p>
        </div>
      ) : (
        <>
          {currentView === 'dashboard' && (
            <FinanceDashboard transactions={transactions} />
          )}

          {currentView === 'transactions' && (
            <TransactionList
              transactions={transactions}
              onEdit={handleUpdateTransaction}
              onDelete={handleDeleteTransaction}
            />
          )}

          {currentView === 'reports' && (
            <MonthlyReport
              transactions={transactions}
              canExportPdf={user.tier.exportToPdf}
            />
          )}
        </>
      )}

      {/* Add Transaction Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Add Transaction</h3>
            <TransactionForm
              onSubmit={handleAddTransaction}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}