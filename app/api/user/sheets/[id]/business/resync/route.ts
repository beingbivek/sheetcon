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
    // Use 'relaxed' — resync is user-initiated, not a write op
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

    // Run sequentially to avoid hitting Google rate limits
    const results = {
      products: 0,
      suppliers: 0,
      customers: 0,
      purchases: 0,
      sales: 0,
      config: false as boolean,
      errors: [] as string[],
    };

    try {
      results.products = await importProductsFromSheet(
        user.id, connection.id, connection.spreadsheetId
      );
    } catch (e) {
      results.errors.push(`products: ${String(e)}`);
    }

    try {
      results.suppliers = await importSuppliersFromSheet(
        user.id, connection.id, connection.spreadsheetId
      );
    } catch (e) {
      results.errors.push(`suppliers: ${String(e)}`);
    }

    try {
      results.customers = await importCustomersFromSheet(
        user.id, connection.id, connection.spreadsheetId
      );
    } catch (e) {
      results.errors.push(`customers: ${String(e)}`);
    }

    try {
      results.purchases = await importPurchasesFromSheet(
        user.id, connection.id, connection.spreadsheetId
      );
    } catch (e) {
      results.errors.push(`purchases: ${String(e)}`);
    }

    try {
      results.sales = await importSalesFromSheet(
        user.id, connection.id, connection.spreadsheetId
      );
    } catch (e) {
      results.errors.push(`sales: ${String(e)}`);
    }

    try {
      results.config = await importConfigFromSheet(
        user.id, connection.id, connection.spreadsheetId
      );
    } catch (e) {
      results.errors.push(`config: ${String(e)}`);
    }

    // Update last synced
    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED' },
    });

    return NextResponse.json({
      success: true,
      synced: results,
      syncedAt: new Date().toISOString(),
    });
  });
}