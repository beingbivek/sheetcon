// app/api/admin/users/[id]/change-tier/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth-helpers';

// POST /api/admin/users/[id]/change-tier - Change user tier
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

    if (!body.tierId) {
      return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tier: true,
        _count: {
          select: { sheetConnections: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if tier exists
    const newTier = await prisma.tier.findUnique({
      where: { id: body.tierId },
    });

    if (!newTier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Check if same tier
    if (user.tierId === body.tierId) {
      return NextResponse.json(
        { error: 'User is already on this tier' },
        { status: 400 }
      );
    }

    // Validate tier limits on downgrade
    if (newTier.maxSheets !== -1 && user._count.sheetConnections > newTier.maxSheets) {
      return NextResponse.json(
        { 
          error: `Cannot downgrade: User has ${user._count.sheetConnections} sheets connected, but new tier only allows ${newTier.maxSheets}` 
        },
        { status: 400 }
      );
    }

    // Get old tier for logging
    const oldTier = user.tier;

    // Update user tier
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        tierId: body.tierId,
      },
      include: {
        tier: true,
      },
    });

    // Update tier user counts
    await prisma.$transaction([
      // Decrement old tier user count
      prisma.tier.update({
        where: { id: oldTier.id },
        data: {
          currentUserCount: {
            decrement: 1,
          },
        },
      }),
      // Increment new tier user count
      prisma.tier.update({
        where: { id: newTier.id },
        data: {
          currentUserCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `User tier changed from ${oldTier.name} to ${newTier.name}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        tier: updatedUser.tier.name,
      },
    });
  } catch (error: any) {
    console.error('Error changing user tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change user tier' },
      { status: 500 }
    );
  }
}