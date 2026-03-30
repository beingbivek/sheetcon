// app/api/user/sheets/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's access token
    const user = session.user as any;
    
    if (!user.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Note: In production, you'd use the stored access token from the database
    // For now, we'll return a placeholder
    // You'll need to implement proper Google Drive API integration

    // Placeholder response
    const sheets = [
      {
        id: 'sheet-1-id',
        name: 'My Sample Sheet',
      },
      {
        id: 'sheet-2-id',
        name: 'Sales Data 2024',
      },
    ];

    return NextResponse.json({ sheets });
  } catch (error: any) {
    console.error('Error listing sheets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list sheets' },
      { status: 500 }
    );
  }
}