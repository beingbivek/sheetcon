// components/user/UserSidebar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';

interface UserSidebarProps {
  session: Session;
}

export default function UserSidebar({ session }: UserSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: '🏠',
    },
    {
      name: 'My Sheets',
      href: '/dashboard/sheets',
      icon: '📊',
    },
    {
      name: 'Connect Sheet',
      href: '/dashboard/connect',
      icon: '🔗',
    },
    {
      name: 'Templates',
      href: '/dashboard/templates',
      icon: '📋',
    },
    {
      name: 'Billing',
      href: '/dashboard/billing',
      icon: '💳',
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: '⚙️',
    },
  ];

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-white border-r border-slate-200 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6 py-5 border-b border-slate-200">
          <Link href="/dashboard" className="text-2xl font-bold text-slate-900">
            SheetCon
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                  ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {session.user.name || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {(session.user as any).tierName || 'Free'} Plan
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}