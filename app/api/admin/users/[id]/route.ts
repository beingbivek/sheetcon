// app/api/admin/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth-helpers';

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tier: true,
        sheetConnections: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            sheetConnections: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is being changed and if it already exists
    if (body.email && body.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Check if tier exists
    if (body.tierId) {
      const tierExists = await prisma.tier.findUnique({
        where: { id: body.tierId },
      });

      if (!tierExists) {
        return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
      }
    }

    // Prepare update data
    const updateData: any = {
      name: body.name || null,
      email: body.email,
      isActive: body.isActive,
      emailVerified: body.emailVerified,
    };

    // Handle tier change
    if (body.tierId && body.tierId !== existingUser.tierId) {
      updateData.tierId = body.tierId;

      // Update tier user counts
      await prisma.$transaction([
        prisma.tier.update({
          where: { id: existingUser.tierId },
          data: { currentUserCount: { decrement: 1 } },
        }),
        prisma.tier.update({
          where: { id: body.tierId },
          data: { currentUserCount: { increment: 1 } },
        }),
      ]);
    }

    // Reset usage if requested
    if (body.resetUsage) {
      updateData.crudCountToday = 0;
      updateData.lastCrudReset = new Date();
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        tier: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (cascade will delete sheet connections)
    await prisma.user.delete({
      where: { id },
    });

    // Decrement tier user count
    await prisma.tier.update({
      where: { id: user.tierId },
      data: { currentUserCount: { decrement: 1 } },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}