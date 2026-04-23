// components/templates/finance/TransactionForm.tsx

'use client';

import { useState } from 'react';
import LoadingButton from '@/components/ui/LoadingButton';

interface TransactionFormProps {
  onSubmit: (transaction: any) => Promise<void>;
  onCancel: () => void;
  initialData?: any;
}

export default function TransactionForm({
  onSubmit,
  onCancel,
  initialData,
}: TransactionFormProps) {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    description: initialData?.description || '',
    category: initialData?.category || '',
    type: initialData?.type || 'expense',
    amount: initialData?.amount || '',
  });
  
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double-submit
    if (submitting) return;
    
    setSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
      });
    } catch (error) {
      console.error('Transaction submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
          disabled={submitting}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Grocery shopping"
          required
          disabled={submitting}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Category
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          required
          disabled={submitting}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <option value="">Select category</option>
          <option value="Salary">Salary</option>
          <option value="Freelance">Freelance</option>
          <option value="Investment">Investment</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Shopping">Shopping</option>
          <option value="Bills">Bills</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Health">Health</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Type
        </label>
        <div className="flex gap-4">
          <label className={`flex items-center gap-2 ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="radio"
              name="type"
              value="income"
              checked={formData.type === 'income'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={submitting}
              className="w-4 h-4 text-green-600"
            />
            <span className="text-green-600 font-medium">Income</span>
          </label>
          <label className={`flex items-center gap-2 ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="radio"
              name="type"
              value="expense"
              checked={formData.type === 'expense'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={submitting}
              className="w-4 h-4 text-red-600"
            />
            <span className="text-red-600 font-medium">Expense</span>
          </label>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Amount (₹)
        </label>
        <input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0.00"
          min="0"
          step="0.01"
          required
          disabled={submitting}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <LoadingButton
          type="submit"
          loading={submitting}
          loadingText={initialData ? 'Saving...' : 'Adding...'}
          variant={formData.type === 'income' ? 'success' : 'primary'}
          className="flex-1"
        >
          {initialData ? 'Save Changes' : 'Add Transaction'}
        </LoadingButton>
      </div>
    </form>
  );
}