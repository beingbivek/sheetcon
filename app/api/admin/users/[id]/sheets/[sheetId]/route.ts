// app/api/admin/users/[id]/sheets/[sheetId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, errorResponse } from '@/lib/security';
import { prisma } from '@/lib/db';

// DELETE - Remove a sheet connection (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();
    
    const { id: userId, sheetId } = await params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify sheet connection exists and belongs to this user
    const sheetConnection = await prisma.sheetConnection.findFirst({
      where: {
        id: sheetId,
        userId: userId,
      },
      select: {
        id: true,
        spreadsheetName: true,
        templateId: true,
      },
    });

    if (!sheetConnection) {
      return NextResponse.json(
        { error: 'Sheet connection not found' },
        { status: 404 }
      );
    }

    // Delete the sheet connection
    await prisma.sheetConnection.delete({
      where: { id: sheetId },
    });

    // Log the action (optional - for audit trail)
    console.log(
      `[Admin Action] Admin ${admin.email} deleted sheet connection "${sheetConnection.spreadsheetName}" (${sheetId}) for user ${user.email}`
    );

    return NextResponse.json({
      success: true,
      message: `Sheet connection "${sheetConnection.spreadsheetName}" has been removed`,
      deletedSheet: {
        id: sheetConnection.id,
        name: sheetConnection.spreadsheetName,
        templateId: sheetConnection.templateId,
      },
    });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

// GET - Get sheet connection details (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    await requireAdmin();
    
    const { id: userId, sheetId } = await params;

    const sheetConnection = await prisma.sheetConnection.findFirst({
      where: {
        id: sheetId,
        userId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!sheetConnection) {
      return NextResponse.json(
        { error: 'Sheet connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sheetConnection });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}