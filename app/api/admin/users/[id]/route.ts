// app/api/admin/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireAdmin,
  requireRateLimit,
  validateInput,
  adminUserUpdateSchema,
  errorResponse,
  Errors,
} from '@/lib/security';

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Require admin
    await requireAdmin();
    await requireRateLimit(request, null, 'standard');
    
    // 2. Get params
    const { id } = await params;

    // 3. Fetch user
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tier: true,
        sheetConnections: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { sheetConnections: true },
        },
      },
    });

    if (!user) {
      throw Errors.notFound('User');
    }

    // 4. Remove sensitive fields before sending
    const { accessToken, refreshToken, ...safeUser } = user;

    return NextResponse.json(safeUser);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Require admin (with proper role check)
    const admin = await requireAdmin(['SUPER_ADMIN', 'ADMIN']);
    await requireRateLimit(request, admin.id, 'standard');
    
    // 2. Get and validate input
    const { id } = await params;
    const rawBody = await request.json();
    
    // 3. Validate with strict schema (prevents field injection)
    const body = validateInput(adminUserUpdateSchema, rawBody);

    // 4. Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw Errors.notFound('User');
    }

    // 5. Check if email is being changed and if it already exists
    if (body.email && body.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (emailExists) {
        throw Errors.validation([{ field: 'email', message: 'Email already exists' }]);
      }
    }

    // 6. Check if tier exists
    if (body.tierId) {
      const tierExists = await prisma.tier.findUnique({
        where: { id: body.tierId },
      });

      if (!tierExists) {
        throw Errors.notFound('Tier');
      }
    }

    // 7. Prepare update data (only allowed fields)
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.emailVerified !== undefined) updateData.emailVerified = body.emailVerified;
    
    // Reset usage if requested
    if (body.resetUsage) {
      updateData.crudCountToday = 0;
      updateData.lastCrudResetAt = new Date();
    }

    // 8. Handle tier change
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

    // 9. Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { tier: true },
    });

    // 10. Remove sensitive fields
    const { accessToken, refreshToken, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Require SUPER_ADMIN for deletion
    const admin = await requireAdmin(['SUPER_ADMIN']);
    await requireRateLimit(request, admin.id, 'strict');
    
    // 2. Get params
    const { id } = await params;

    // 3. Fetch user
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw Errors.notFound('User');
    }

    // 4. Delete user (cascade will delete sheet connections)
    await prisma.user.delete({
      where: { id },
    });

    // 5. Decrement tier user count
    await prisma.tier.update({
      where: { id: user.tierId },
      data: { currentUserCount: { decrement: 1 } },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}