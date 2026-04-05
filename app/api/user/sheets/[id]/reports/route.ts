// app/api/user/sheets/[id]/reports/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  verifySheetOwnershipByEmail,
  requireRateLimit,
  errorResponse,
} from '@/lib/security';
import { getInventoryReport } from '@/lib/google-sheet-inventory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');
    
    const { id } = await params;
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);

    const report = await getInventoryReport(connection.user.id, connection.spreadsheetId);

    return NextResponse.json({ report });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}