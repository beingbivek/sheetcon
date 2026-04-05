// app/api/user/sheets/[id]/customers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  verifySheetOwnershipByEmail,
  checkAndIncrementCrudLimit,
  requireRateLimit,
  validateInput,
  customerCreateSchema,
  errorResponse,
} from '@/lib/security';
import { prisma } from '@/lib/db';
import { readCustomers, appendCustomer } from '@/lib/google-sheet-inventory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');
    
    const { id } = await params;
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);

    const customers = await readCustomers(connection.user.id, connection.spreadsheetId);

    return NextResponse.json({ customers });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'api');
    
    const { id } = await params;
    const rawBody = await request.json();
    const body = validateInput(customerCreateSchema, rawBody);
    
    const { connection } = await verifySheetOwnershipByEmail(user.email, id);
    
    await checkAndIncrementCrudLimit(connection.user.id);
    
    const customer = await appendCustomer(connection.user.id, connection.spreadsheetId, body);

    return NextResponse.json({ success: true, customer });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}