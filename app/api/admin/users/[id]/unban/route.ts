// app/api/admin/users/[id]/unban/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth-helpers';

// POST /api/admin/users/[id]/unban - Unban user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        isBanned: false,
        banReason: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error unbanning user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unban user' },
      { status: 500 }
    );
  }
}