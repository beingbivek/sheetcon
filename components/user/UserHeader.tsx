// components/user/UserHeader.tsx

'use client';

import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';

interface UserHeaderProps {
  session: Session;
}

export default function UserHeader({ session }: UserHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Welcome back,</p>
          <p className="font-medium text-slate-900">{session.user.name || session.user.email}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Sign Out */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}