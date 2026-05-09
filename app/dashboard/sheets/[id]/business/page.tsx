// app/dashboard/sheets/[id]/business/page.tsx

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getConfig } from '@/lib/google-sheet-business';
import BusinessApp from './BusinessApp';

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: connectionId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).type !== 'user') {
    redirect('/login');
  }

  const connection = await prisma.sheetConnection.findFirst({
    where: {
      id: connectionId,
      userId: (session.user as any).id,
      templateId: 'business-management',
      isActive: true,
    },
    include: {
      user: {
        include: { tier: true },
      },
    },
  });

  if (!connection) {
    redirect('/dashboard');
  }

  let config: Record<string, string> = {};
  let setupRequired = false;

  try {
    config = await getConfig(connection.user.id, connection.spreadsheetId);
    setupRequired = !config.businessName || config.businessName.trim() === '';
  } catch {
    setupRequired = true;
  }

  const serializedConnection = {
    id: connection.id,
    spreadsheetId: connection.spreadsheetId,
    spreadsheetName: connection.spreadsheetName,
    spreadsheetUrl: connection.spreadsheetUrl,
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