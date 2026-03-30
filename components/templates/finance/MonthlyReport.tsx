// components/templates/finance/MonthlyReport.tsx

'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
}

interface MonthlyReportProps {
  transactions: Transaction[];
  canExportPdf: boolean;
}

export default function MonthlyReport({ transactions, canExportPdf }: MonthlyReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const monthData = useMemo(() => {
    const monthDate = new Date(selectedMonth);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= start && date <= end;
    });

    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      transactions: monthTransactions,
      income,
      expenses,
      balance: income - expenses,
    };
  }, [transactions, selectedMonth]);

  const handleExportPdf = () => {
    if (!canExportPdf) {
      alert('PDF export is not available on your plan. Please upgrade to access this feature.');
      return;
    }

    alert('PDF export feature coming soon! This will generate a professional PDF statement.');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-900">Monthly Report</h3>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleExportPdf}
          disabled={!canExportPdf}
          className={`px-4 py-2 rounded-lg transition-colors ${
            canExportPdf
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          📄 Export PDF
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-green-700 text-sm font-medium mb-1">Total Income</p>
          <p className="text-2xl font-bold text-green-600">₹{monthData.income.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700 text-sm font-medium mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">₹{monthData.expenses.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-sm font-medium mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${monthData.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            ₹{monthData.balance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      <div>
        <h4 className="font-semibold text-slate-900 mb-3">
          Transactions ({monthData.transactions.length})
        </h4>
        {monthData.transactions.length > 0 ? (
          <div className="space-y-2">
            {monthData.transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{transaction.description}</p>
                  <p className="text-sm text-slate-500">
                    {format(new Date(transaction.date), 'MMM d')} • {transaction.category}
                  </p>
                </div>
                <p
                  className={`font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No transactions this month</p>
        )}
      </div>
    </div>
  );
}