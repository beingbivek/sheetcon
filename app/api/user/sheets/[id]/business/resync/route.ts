// app/api/user/sheets/[id]/business/resync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requireAuth, requireRateLimit } from '@/lib/security';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');

    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id: connectionId,
        userId: user.id,
        templateId: 'business-management',
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const {
      importProductsFromSheet,
      importSuppliersFromSheet,
      importCustomersFromSheet,
      importPurchasesFromSheet,
      importSalesFromSheet,
      importConfigFromSheet,
    } = await import('@/lib/db-sync');

    const [products, suppliers, customers, purchases, sales, config] =
      await Promise.all([
        importProductsFromSheet(user.id, connection.id, connection.spreadsheetId),
        importSuppliersFromSheet(user.id, connection.id, connection.spreadsheetId),
        importCustomersFromSheet(user.id, connection.id, connection.spreadsheetId),
        importPurchasesFromSheet(user.id, connection.id, connection.spreadsheetId),
        importSalesFromSheet(user.id, connection.id, connection.spreadsheetId),
        importConfigFromSheet(user.id, connection.id, connection.spreadsheetId),
      ]);

    return NextResponse.json({
      success: true,
      imported: { products, suppliers, customers, purchases, sales, config },
    });
  });
}