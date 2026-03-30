// app/dashboard/sheets/[id]/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import FinanceApp from '@/components/templates/finance/FinanceApp';
import InventoryApp from '@/components/templates/inventory/InventoryApp';

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

  // Get sheet connection
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

  // Check if user owns this sheet
  if (connection.user.email !== session.user.email) {
    redirect('/dashboard');
  }

  // Render appropriate template
  if (connection.templateId === 'finance') {
    return <FinanceApp connection={connection} user={connection.user} />;
  } else if (connection.templateId === 'inventory') {
    return <InventoryApp connection={connection} user={connection.user} />;
  } else {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Unknown template: {connection.templateId}</p>
      </div>
    );
  }
}