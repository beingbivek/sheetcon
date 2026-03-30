// components/admin/BanUserButton.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BanUserButtonProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
  };
}

export default function BanUserButton({ user }: BanUserButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [banReason, setBanReason] = useState('');

  const handleBan = async () => {
    if (!banReason.trim()) {
      setError('Please provide a reason for banning');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const action = user.isActive ? 'ban' : 'unban';
      const response = await fetch(`/api/admin/users/${user.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: banReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      router.refresh();
      setShowConfirm(false);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
          user.isActive
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {user.isActive ? 'Ban User' : 'Unban User'}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              {user.isActive ? 'Ban User' : 'Unban User'}
            </h3>
            
            <p className="text-slate-300 mb-4">
              {user.isActive
                ? `Are you sure you want to ban ${user.name || user.email}?`
                : `Are you sure you want to unban ${user.name || user.email}?`
              }
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason *
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for this action..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  user.isActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isLoading && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {user.isActive ? 'Ban User' : 'Unban User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}