// app/admin/tiers/new/page.tsx

import TierForm from '@/components/admin/TierForm';

export default function NewTierPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Tier</h1>
        <p className="text-slate-400">Add a new subscription plan</p>
      </div>

      <TierForm />
    </div>
  );
}
