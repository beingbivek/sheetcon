// app/api/admin/tiers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth-helpers';

// GET /api/admin/tiers/[id] - Get single tier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Changed to Promise
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;  // ← Await params

    const tier = await prisma.tier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    return NextResponse.json(tier);
  } catch (error) {
    console.error('Error fetching tier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/tiers/[id] - Update tier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Changed to Promise
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;  // ← Await params
    const body = await request.json();

    // Check if tier exists
    const existing = await prisma.tier.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Check if slug is being changed and already exists
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await prisma.tier.findUnique({
        where: { slug: body.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A tier with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update tier
    const tier = await prisma.tier.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        price: body.price,
        currency: body.currency,
        maxUsers: body.maxUsers,
        maxSheets: body.maxSheets,
        maxTemplates: body.maxTemplates,
        maxCrudPerDay: body.maxCrudPerDay,
        customBranding: body.customBranding,
        prioritySupport: body.prioritySupport,
        exportToPdf: body.exportToPdf,
        isActive: body.isActive,
        displayOrder: body.displayOrder,
      },
    });

    return NextResponse.json(tier);
  } catch (error: any) {
    console.error('Error updating tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tier' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tiers/[id] - Delete tier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Changed to Promise
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;  // ← Await params

    // Check if tier exists
    const tier = await prisma.tier.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Protect default tiers
    const protectedSlugs = ['free', 'pro', 'business'];
    if (protectedSlugs.includes(tier.slug)) {
      return NextResponse.json(
        { error: 'Cannot delete default tiers (Free, Pro, Business)' },
        { status: 400 }
      );
    }

    // Check if tier has users
    if (tier._count.users > 0) {
      return NextResponse.json(
        { error: `Cannot delete tier with ${tier._count.users} active users. Move users to another tier first.` },
        { status: 400 }
      );
    }

    // Delete the tier
    await prisma.tier.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Tier deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete tier' },
      { status: 500 }
    );
  }
}