// app/api/admin/tiers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';

// GET /api/admin/tiers - List all tiers
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const tiers = await prisma.tier.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json(tiers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tiers' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tiers - Create new tier
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.tier.findUnique({
      where: { slug: body.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A tier with this slug already exists' },
        { status: 400 }
      );
    }

    // Create tier
    const tier = await prisma.tier.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        price: body.price || 0,
        currency: body.currency || 'INR',
        maxUsers: body.maxUsers ?? -1,
        maxSheets: body.maxSheets ?? 1,
        maxTemplates: body.maxTemplates ?? 1,
        maxCrudPerDay: body.maxCrudPerDay ?? 1000,
        customBranding: body.customBranding || false,
        prioritySupport: body.prioritySupport || false,
        exportToPdf: body.exportToPdf ?? true,
        isActive: body.isActive ?? true,
        displayOrder: body.displayOrder || 0,
      },
    });

    return NextResponse.json(tier, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create tier' },
      { status: 500 }
    );
  }
}