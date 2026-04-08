// components/admin/DeleteSheetConnectionButton.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SheetConnection {
  id: string;
  spreadsheetName: string;
  spreadsheetId: string;
  templateId: string | null;
  sheetType: string;
  isActive: boolean;
  createdAt: Date;
}

interface DeleteSheetConnectionButtonProps {
  userId: string;
  sheet: SheetConnection;
}

export default function DeleteSheetConnectionButton({
  userId,
  sheet,
}: DeleteSheetConnectionButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/sheets/${sheet.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete sheet connection');
      }

      // Close modal and refresh the page
      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Delete Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        title="Remove sheet connection"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isDeleting && setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6 shadow-2xl">
            {/* Warning Icon */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Remove Sheet Connection?
            </h3>

            {/* Description */}
            <p className="text-slate-400 text-center mb-4">
              Are you sure you want to remove this sheet connection?
            </p>

            {/* Sheet Info */}
            <div className="bg-slate-900 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {sheet.templateId === 'finance' ? '💰' : 
                   sheet.templateId === 'inventory' ? '📦' : '📊'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {sheet.spreadsheetName}
                  </p>
                  <p className="text-sm text-slate-400">
                    {sheet.templateId || 'No template'} • {sheet.sheetType}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-mono truncate">
                    ID: {sheet.spreadsheetId}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> This will only remove the connection from SheetCon. 
                The actual Google Sheet will NOT be deleted and the user can reconnect it later.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Removing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Remove Connection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}