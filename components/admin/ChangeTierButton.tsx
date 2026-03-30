// components/admin/ChangeTierButton.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ChangeTierButtonProps {
  user: {
    id: string;
    email: string;
  };
  currentTier: {
    id: string;
    name: string;
  };
}

export default function ChangeTierButton({ user, currentTier }: ChangeTierButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [tiers, setTiers] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState(currentTier.id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (showModal) {
      fetchTiers();
    }
  }, [showModal]);

  const fetchTiers = async () => {
    try {
      const response = await fetch('/api/admin/tiers');
      const data = await response.json();
      if (response.ok) {
        setTiers(data);
      }
    } catch (error) {
      console.error('Failed to fetch tiers:', error);
    }
  };

  const handleChangeTier = async () => {
    if (selectedTier === currentTier.id) {
      setError('User is already on this tier');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/change-tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: selectedTier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change tier');
      }

      router.refresh();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
      >
        Change Tier
      </button>

      {/* Change Tier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Change Tier for {user.email}
            </h3>
            
            <p className="text-slate-300 mb-4">
              Current tier: <span className="font-medium">{currentTier.name}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select New Tier
              </label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} (₹{tier.price}/month)
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeTier}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Change Tier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}