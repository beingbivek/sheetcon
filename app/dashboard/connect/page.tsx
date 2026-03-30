// app/dashboard/connect/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import SheetConnectionWizard from '@/components/user/SheetConnectionWizard';

export default async function ConnectSheetPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      tier: true,
      _count: {
        select: { sheetConnections: true },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  // Check if user can connect more sheets
  const sheetsLimit = user.tier.maxSheets;
  const currentSheets = user._count.sheetConnections;
  const canConnect = sheetsLimit === -1 || currentSheets < sheetsLimit;

  if (!canConnect) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <span className="text-6xl mb-4 block">🚫</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sheet Limit Reached</h2>
          <p className="text-slate-600 mb-6">
            You've connected {currentSheets} sheets. Your {user.tier.name} plan allows {sheetsLimit} sheets.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/dashboard"
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </a>
            <a
              href="/dashboard/billing"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Upgrade Plan →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Connect Google Sheet</h1>
        <p className="text-slate-600">
          Link your Google Sheet and choose a template to get started
        </p>
      </div>

      <SheetConnectionWizard user={user} />
    </div>
  );
}