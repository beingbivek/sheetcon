// app/api/user/sheets/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { listUserSpreadsheets } from '@/lib/google-sheet';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
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

    // Fetch real sheets from Google Drive
    const sheets = await listUserSpreadsheets(user.id);

    return NextResponse.json({ sheets });
  } catch (error: any) {
    console.error('Error listing sheets:', error);

    // Handle specific Google API errors
    if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
      return NextResponse.json(
        { error: 'Google session expired. Please sign out and sign in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to list sheets' },
      { status: 500 }
    );
  }
}