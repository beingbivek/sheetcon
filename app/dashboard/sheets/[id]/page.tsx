// app/dashboard/sheets/[id]/page.tsx (COMPLETE REPLACEMENT)

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import FinanceApp from '@/components/templates/finance/FinanceApp';
import InventoryApp from '@/components/templates/inventory/InventoryApp';
// import { getConfig } from '@/lib/google-sheet-business';
  import { readConfigFresh } from '@/lib/google-sheet-business';
import BusinessApp from './business/BusinessApp';

export default async function SheetAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const connection = await prisma.sheetConnection.findUnique({
    where: { id },
    include: {
      user: {
        include: { tier: true },
      },
    },
  });

  if (!connection) {
    notFound();
  }

  if (connection.user.email !== session.user.email) {
    redirect('/dashboard');
  }

  // ── Finance ──────────────────────────────────────
  if (connection.templateId === 'finance') {
    return <FinanceApp connection={connection} user={connection.user} />;
  }

  // ── Inventory ────────────────────────────────────
  if (connection.templateId === 'inventory') {
    return (
      <InventoryApp
        connection={{
          id: connection.id,
          spreadsheetName: connection.spreadsheetName,
          spreadsheetId: connection.spreadsheetId,
          spreadsheetUrl: connection.spreadsheetUrl || '',
        }}
        user={{
          tier: {
            exportToPdf: connection.user.tier.exportToPdf,
            maxCrudPerDay: connection.user.tier.maxCrudPerDay,
          },
          crudCountToday: connection.user.crudCountToday,
        }}
      />
    );
  }

  // ── Business Management ──────────────────────────
  if (connection.templateId === 'business-management') {
    let config: Record<string, string> = {};
    let setupRequired = false;

    try {
      // config = await getConfig(connection.user.id, connection.spreadsheetId);
    
config = await readConfigFresh(connection.user.id, connection.spreadsheetId);
      setupRequired =
        !config.businessName || config.businessName.trim() === '';
    } catch {
      setupRequired = true;
    }

    const serializedConnection = {
      id: connection.id,
      spreadsheetId: connection.spreadsheetId,
      spreadsheetName: connection.spreadsheetName,
      spreadsheetUrl: connection.spreadsheetUrl ?? '',
      createdAt: connection.createdAt.toISOString(),
      user: {
        id: connection.user.id,
        name: connection.user.name,
        email: connection.user.email,
        tier: {
          name: connection.user.tier.name,
          maxCrudPerDay: connection.user.tier.maxCrudPerDay,
        },
      },
    };

    return (
      <BusinessApp
        connection={serializedConnection}
        initialConfig={config}
        setupRequired={setupRequired}
      />
    );
  }

  // ── Unknown ──────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <p className="text-slate-500 text-sm">
          Unknown template:{' '}
          <span className="font-mono text-slate-700">{connection.templateId}</span>
        </p>
        <a
          href="/dashboard"
          className="mt-4 inline-block text-blue-600 hover:underline text-sm"
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}