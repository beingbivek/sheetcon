// app/api/user/sheets/[id]/business/products/route.ts

import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuth, requireRateLimit } from "@/lib/security";
import { prisma } from "@/lib/db";
import { getProducts, createProduct } from "@/lib/google-sheet-business";
import { z } from "zod/v4";

const CreateProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  costPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  stock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(5),
  unit: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'relaxed');

    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id: connectionId,
        userId: user.id,
        templateId: 'business-management',
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const products = await getProducts(user.id, connection.spreadsheetId);
    return NextResponse.json({ success: true, products });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApiError(async () => {
    const { id: connectionId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, "standard");

    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id: connectionId,
        userId: user.id,
        templateId: "business-management",
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 },
      );
    }

    const body = CreateProductSchema.parse(await request.json());
    const product = await createProduct(user.id, connection.spreadsheetId, {
      name: body.name,
      sku: body.sku ?? null,
      category: body.category ?? null,
      description: body.description ?? null,
      costPrice: body.costPrice,
      sellingPrice: body.sellingPrice,
      stock: body.stock,
      minStock: body.minStock,
      unit: body.unit ?? null,
      supplierId: body.supplierId ?? null,
      supplierName: body.supplierName ?? null,
      imageUrl: body.imageUrl ?? null,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  });
}
