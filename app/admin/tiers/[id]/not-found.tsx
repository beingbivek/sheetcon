// app/admin/tiers/[id]/not-found.tsx

import Link from 'next/link';

export default function TierNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-2">Tier Not Found</h2>
        <p className="text-slate-400 mb-8">
          The tier you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          href="/admin/tiers"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          Back to Tiers
        </Link>
      </div>
    </div>
  );
}