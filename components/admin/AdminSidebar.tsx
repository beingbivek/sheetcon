'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';

interface AdminSidebarProps {
  session: Session;
}

export default function AdminSidebar({ session }: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: '🏠' },
    { name: 'Users', href: '/admin/users', icon: '👥' },
    { name: 'Tiers', href: '/admin/tiers', icon: '📊' },
    { name: 'Templates', href: '/admin/templates', icon: '📋' },
    { name: 'Payments', href: '/admin/payments', icon: '💳' },
    { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
  ];

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-slate-800 border-r border-slate-700 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6 py-5 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">SheetCon</h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                  ${isActive ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
                `}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-slate-700 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-slate-400 truncate">{(session.user as any).role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}