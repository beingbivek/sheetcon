// app/api/user/sheets/connect/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  createFinanceSpreadsheet,
  getSpreadsheetMetadata,
  initializeExistingSheet,
} from '@/lib/google-sheet';

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

    if (!user.accessToken) {
      return NextResponse.json(
        { error: 'Google account not connected. Please sign out and sign in again.' },
        { status: 401 }
      );
    }

    // Check sheet limit
    if (user.tier.maxSheets !== -1 && user._count.sheetConnections >= user.tier.maxSheets) {
      return NextResponse.json(
        { error: `Sheet limit reached (${user.tier.maxSheets}). Upgrade your plan.` },
        { status: 403 }
      );
    }

    let finalSpreadsheetId: string;
    let finalSpreadsheetName: string;
    let finalSpreadsheetUrl: string;

    if (method === 'create') {
      // Create a new Google Sheet
      const sheetTitle = sheetName || `SheetCon - ${templateId === 'finance' ? 'Finance Tracker' : 'Inventory'} - ${new Date().toLocaleDateString()}`;
      
      const result = await createFinanceSpreadsheet(user.id, sheetTitle);
      
      finalSpreadsheetId = result.spreadsheetId;
      finalSpreadsheetName = sheetTitle;
      finalSpreadsheetUrl = result.spreadsheetUrl;
    } else {
      // Use existing sheet
      if (!sheetId) {
        return NextResponse.json(
          { error: 'Sheet ID is required for existing sheets' },
          { status: 400 }
        );
      }

      // Check if already connected
      const existingConnection = await prisma.sheetConnection.findFirst({
        where: {
          userId: user.id,
          spreadsheetId: sheetId,
        },
      });

      if (existingConnection) {
        return NextResponse.json(
          { error: 'This sheet is already connected' },
          { status: 409 }
        );
      }

      // Verify access and get metadata
      const metadata = await getSpreadsheetMetadata(user.id, sheetId);
      
      // Initialize with headers if needed
      await initializeExistingSheet(user.id, sheetId, 'Sheet1');

      finalSpreadsheetId = sheetId;
      finalSpreadsheetName = sheetName || metadata.title;
      finalSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    }

    // Create connection in database
    const connection = await prisma.sheetConnection.create({
      data: {
        userId: user.id,
        sheetType: 'google_sheets',
        spreadsheetId: finalSpreadsheetId,
        spreadsheetName: finalSpreadsheetName,
        spreadsheetUrl: finalSpreadsheetUrl,
        templateId,
        templateLocked: true,
        lockedAt: new Date(),
        isActive: true,
        syncStatus: 'ACTIVE',
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      spreadsheetId: finalSpreadsheetId,
      spreadsheetUrl: finalSpreadsheetUrl,
      message: 'Sheet connected successfully',
    });
  } catch (error: any) {
    console.error('Error connecting sheet:', error);

    // Handle specific errors
    if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
      return NextResponse.json(
        { error: 'Google session expired. Please sign out and sign in again.' },
        { status: 401 }
      );
    }

    if (error.code === 403) {
      return NextResponse.json(
        { error: 'Access denied. Make sure you have permission to access this sheet.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to connect sheet' },
      { status: 500 }
    );
  }
}