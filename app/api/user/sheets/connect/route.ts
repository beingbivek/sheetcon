// app/api/user/sheets/connect/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { method, sheetId, sheetName, templateId } = body;

    if (!method || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: {
        tier: true,
        _count: { select: { sheetConnections: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check sheet limit
    if (user.tier.maxSheets !== -1 && user._count.sheetConnections >= user.tier.maxSheets) {
      return NextResponse.json(
        { error: 'Sheet limit reached for your tier' },
        { status: 400 }
      );
    }

    // Create sheet connection
    const finalSheetId = method === 'create'
      ? `new-sheet-${Date.now()}`  // Placeholder - in production, create actual Google Sheet
      : sheetId;

    const finalSheetName = method === 'create'
      ? (sheetName || 'Untitled Sheet')
      : sheetName;

    const connection = await prisma.sheetConnection.create({
      data: {
        userId: user.id,
        sheetType: 'google_sheets',
        spreadsheetId: finalSheetId,
        spreadsheetName: finalSheetName,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${finalSheetId}`,
        templateId,
        templateLocked: true,
        lockedAt: new Date(),
        isActive: true,
        syncStatus: 'SYNCED',
      },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      message: 'Sheet connected successfully',
    });
  } catch (error: any) {
    console.error('Error connecting sheet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect sheet' },
      { status: 500 }
    );
  }
}