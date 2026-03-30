// app/api/admin/templates/[id]/toggle/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth-helpers';

// POST - Toggle template active status
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

    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updated = await prisma.template.update({
      where: { id },
      data: {
        isActive: !template.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      isActive: updated.isActive,
      message: `Template ${updated.isActive ? 'activated' : 'deactivated'}`,
    });
  } catch (error: any) {
    console.error('Error toggling template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle template' },
      { status: 500 }
    );
  }
}