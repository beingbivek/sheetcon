// components/admin/UserForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserFormProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    tierId: string;
    isActive: boolean;
    emailVerified: boolean;
    isBanned: boolean;
    banReason: string | null;
    crudCountToday: number;
  };
  tiers: {
    id: string;
    name: string;
    price: number;
  }[];
}

export default function UserForm({ user, tiers }: UserFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email,
    tierId: user.tierId,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    resetUsage: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User updated successfully!');
      setTimeout(() => {
        router.push(`/admin/users/${user.id}`);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="User name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>
          </div>
        </div>

        {/* Tier Selection */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Subscription</h3>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tier
            </label>
            <select
              name="tierId"
              value={formData.tierId}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} (₹{tier.price}/month)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-slate-300">Active Account</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="emailVerified"
                checked={formData.emailVerified}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-slate-300">Email Verified</span>
            </label>
          </div>
        </div>

        {/* Usage */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Usage</h3>
          <div className="p-4 bg-slate-900 rounded-lg mb-4">
            <p className="text-slate-300">
              Current CRUD count today: <span className="font-semibold text-white">{user.crudCountToday}</span>
            </p>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="resetUsage"
              checked={formData.resetUsage}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 rounded focus:ring-blue-500"
            />
            <span className="ml-3 text-slate-300">Reset daily usage counter to 0</span>
          </label>
        </div>

        {/* Ban Status (Read-only info) */}
        {user.isBanned && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <h4 className="text-red-400 font-semibold mb-2">⚠️ User is Banned</h4>
            <p className="text-slate-300 text-sm">
              Reason: {user.banReason || 'No reason provided'}
            </p>
            <p className="text-slate-400 text-xs mt-2">
              Use the "Unban User" button on the user details page to lift the ban.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t border-slate-700">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isLoading}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Save Changes
          </button>
        </div>
      </div>
    </form>
  );
}