// app/api/user/sheets/[id]/business/products/[productId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuth, requireRateLimit } from "@/lib/security";
import { prisma } from "@/lib/db";
import { updateProduct, deleteProduct } from "@/lib/google-sheet-business";
import { z } from "zod/v4";

const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  variation: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  stock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  unit: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  pricedWithTax: z.boolean().optional(),  // ← NEW
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  return handleApiError(async () => {
    const { id: connectionId, productId } = await params;
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

    const body = UpdateProductSchema.parse(await request.json());
    const product = await updateProduct(
      user.id,
      connection.spreadsheetId,
      productId,
      body,
    );

    return NextResponse.json({ success: true, product });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  return handleApiError(async () => {
    const { id: connectionId, productId } = await params;
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

    await deleteProduct(user.id, connection.spreadsheetId, productId);
    return NextResponse.json({ success: true });
  });
}