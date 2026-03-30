// components/admin/ToggleTemplateStatus.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ToggleTemplateStatusProps {
  template: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

export default function ToggleTemplateStatus({ template }: ToggleTemplateStatusProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/templates/${template.id}/toggle`, {
        method: 'POST',
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error toggling template status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 ${
        template.isActive
          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
          : 'bg-green-600 hover:bg-green-700 text-white'
      }`}
    >
      {isLoading ? '...' : template.isActive ? 'Deactivate' : 'Activate'}
    </button>
  );
}