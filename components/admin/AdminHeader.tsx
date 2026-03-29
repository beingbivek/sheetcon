// components/admin/AdminHeader.tsx

'use client';

import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';

interface AdminHeaderProps {
  session: Session;
}

export default function AdminHeader({ session }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Admin Portal</h2>
          <p className="text-sm text-slate-400">Manage your SheetCon platform</p>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <button
            onClick={() => signOut({ callbackUrl: '/admin-login' })}  // ← CHANGED THIS
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}