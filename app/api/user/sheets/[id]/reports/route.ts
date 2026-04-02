// app/api/user/sheets/[id]/reports/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getInventoryReport } from '@/lib/google-sheet-inventory';

// GET - Get inventory report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        user: { email: session.user.email! },
        isActive: true,
        templateId: 'inventory',
      },
      include: { user: true },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const report = await getInventoryReport(connection.user.id, connection.spreadsheetId);

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}