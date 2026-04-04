// components/templates/finance/MonthlyReport.tsx

'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { generateFinanceStatementPDF, downloadPDF } from '@/lib/pdf-generator';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function MonthlyReport({ transactions, canExportPdf }: MonthlyReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [exporting, setExporting] = useState(false);

  // Get available months
  const availableMonths = Array.from(
    new Set(transactions.map(t => t.date.substring(0, 7)))
  ).sort().reverse();

  // Filter transactions by selected month
  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  // Calculate stats
  const income = monthTransactions.filter(t => t.type === 'income');
  const expenses = monthTransactions.filter(t => t.type === 'expense');
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Category breakdown for pie chart
  const categoryData = Object.entries(
    monthTransactions.reduce((acc, t) => {
      const key = t.category || 'Uncategorized';
      if (!acc[key]) acc[key] = { income: 0, expense: 0 };
      if (t.type === 'income') acc[key].income += t.amount;
      else acc[key].expense += t.amount;
      return acc;
    }, {} as Record<string, { income: number; expense: number }>)
  ).map(([name, values]) => ({
    name,
    income: values.income,
    expense: values.expense,
    total: values.income - values.expense,
  }));

  // Expense breakdown for pie
  const expenseByCategory = expenses.reduce((acc, t) => {
    const key = t.category || 'Uncategorized';
    acc[key] = (acc[key] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  // Daily breakdown for bar chart
  const dailyData = monthTransactions.reduce((acc, t) => {
    const day = t.date.substring(8, 10);
    if (!acc[day]) acc[day] = { day, income: 0, expense: 0 };
    if (t.type === 'income') acc[day].income += t.amount;
    else acc[day].expense += t.amount;
    return acc;
  }, {} as Record<string, { day: string; income: number; expense: number }>);

  const dailyChartData = Object.values(dailyData).sort((a, b) => a.day.localeCompare(b.day));

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const handleExportPDF = async () => {
    if (!canExportPdf) {
      alert('PDF export is not available on your current plan. Please upgrade to access this feature.');
      return;
    }

    setExporting(true);
    try {
      const blob = await generateFinanceStatementPDF(
        'Financial Statement',
        formatMonthLabel(selectedMonth),
        monthTransactions
      );
      downloadPDF(blob, `finance-statement-${selectedMonth}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableMonths.length > 0 ? (
              availableMonths.map(month => (
                <option key={month} value={month}>{formatMonthLabel(month)}</option>
              ))
            ) : (
              <option value={selectedMonth}>{formatMonthLabel(selectedMonth)}</option>
            )}
          </select>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting || !canExportPdf}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            canExportPdf
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
          title={canExportPdf ? 'Export as PDF' : 'Upgrade to export PDF'}
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              📄 Export PDF
              {!canExportPdf && <span className="text-xs">(Pro)</span>}
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">Total Income</p>
          <p className="text-3xl font-bold text-green-600">
            ₹{totalIncome.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-500 mt-2">{income.length} transactions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-500 mt-2">{expenses.length} transactions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">Net Balance</p>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{balance.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {balance >= 0 ? 'Surplus' : 'Deficit'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Daily Income vs Expenses</h3>
          {dailyChartData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" />
                  <Bar dataKey="expense" fill="#ef4444" name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-12">No data for this month</p>
          )}
        </div>

        {/* Expense Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Expenses by Category</h3>
          {expensePieData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-12">No expenses this month</p>
          )}
        </div>
      </div>

      {/* Category Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Category Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 text-sm font-semibold text-slate-700">Category</th>
                <th className="text-right py-3 text-sm font-semibold text-slate-700">Income</th>
                <th className="text-right py-3 text-sm font-semibold text-slate-700">Expense</th>
                <th className="text-right py-3 text-sm font-semibold text-slate-700">Net</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((cat) => (
                <tr key={cat.name} className="border-b border-slate-100">
                  <td className="py-3 font-medium text-slate-900">{cat.name}</td>
                  <td className="py-3 text-right text-green-600">
                    {cat.income > 0 ? `₹${cat.income.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="py-3 text-right text-red-600">
                    {cat.expense > 0 ? `₹${cat.expense.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className={`py-3 text-right font-medium ${cat.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{cat.total.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td className="py-3 font-bold text-slate-900">Total</td>
                <td className="py-3 text-right font-bold text-green-600">
                  ₹{totalIncome.toLocaleString('en-IN')}
                </td>
                <td className="py-3 text-right font-bold text-red-600">
                  ₹{totalExpenses.toLocaleString('en-IN')}
                </td>
                <td className={`py-3 text-right font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{balance.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}