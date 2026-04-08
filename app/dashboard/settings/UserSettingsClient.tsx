// app/dashboard/settings/UserSettingsClient.tsx

'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

interface UserSettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    tierName: string;
    createdAt: string;
    lastLoginAt: string | null;
  };
}

export default function UserSettingsClient({ user }: UserSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'data'>('profile');
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (confirm('This will permanently delete all your data. Type "DELETE" to confirm.')) {
        // In production, this would call an API to delete the account
        alert('Account deletion requires admin approval. Please contact support.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-8">
          {[
            { key: 'profile', label: 'Profile' },
            { key: 'account', label: 'Account' },
            { key: 'data', label: 'Data & Privacy' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-4 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Profile Information</h2>
          
          <div className="flex items-center gap-6 mb-6">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-semibold">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500">Profile picture is synced from Google</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email is linked to your Google account</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Account Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-500">Subscription</span>
                <span className="font-medium text-slate-900">{user.tierName} Plan</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-500">Member Since</span>
                <span className="font-medium text-slate-900">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-500">Last Login</span>
                <span className="font-medium text-slate-900">{formatDate(user.lastLoginAt)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-500">Authentication</span>
                <span className="font-medium text-slate-900">Google OAuth</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Session</h2>
            <p className="text-slate-600 mb-4">
              You're currently signed in with your Google account.
            </p>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Data & Privacy Tab */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Data</h2>
            <p className="text-slate-600 mb-4">
              SheetCon stores minimal data. Your actual data lives in your Google Sheets.
            </p>
            
            <h3 className="font-medium text-slate-900 mt-4 mb-2">What we store:</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Your email and name (from Google)</li>
              <li>Sheet connection metadata (spreadsheet IDs, template choices)</li>
              <li>Usage statistics (for tier limits)</li>
            </ul>

            <h3 className="font-medium text-slate-900 mt-4 mb-2">What we don't store:</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Your actual spreadsheet data</li>
              <li>Your Google password</li>
              <li>Financial information (unless you add billing)</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Connected Services</h2>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-medium text-slate-900">Google Sheets</p>
                  <p className="text-sm text-slate-500">Read & write access to your sheets</p>
                </div>
              </div>
              <span className="text-green-600 text-sm font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📁</span>
                <div>
                  <p className="font-medium text-slate-900">Google Drive</p>
                  <p className="text-sm text-slate-500">Access to spreadsheet files</p>
                </div>
              </div>
              <span className="text-green-600 text-sm font-medium">Connected</span>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-4">⚠️ Danger Zone</h2>
            <p className="text-red-800 mb-4">
              Deleting your account will remove all your data from SheetCon. Your Google Sheets will not be affected.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}