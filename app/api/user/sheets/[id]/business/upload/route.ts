// app/api/user/sheets/[id]/business/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { requireAuth } from '@/lib/security';
import { requireRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import {
  uploadProductImage,
  uploadBusinessLogo,
  uploadPurchaseBillImage,
  uploadPaymentQR,
} from '@/lib/cloudinary';
import { z } from 'zod/v4';

const UploadSchema = z.object({
  type: z.enum(['product', 'logo', 'purchase-bill', 'payment-qr']),
  base64Data: z.string().min(1, 'Image data is required'),
  referenceId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id: connectionId } = await params;
    const user = await requireAuth();
    await requireRateLimit(request, user.id, 'standard');

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

    const body = UploadSchema.parse(await request.json());

    let url = '';

    switch (body.type) {
      case 'product':
        url = await uploadProductImage(
          body.base64Data,
          body.referenceId ?? `temp_${Date.now()}`
        );
        break;
      case 'logo':
        url = await uploadBusinessLogo(body.base64Data, connectionId);
        break;
      case 'purchase-bill':
        url = await uploadPurchaseBillImage(
          body.base64Data,
          body.referenceId ?? `temp_${Date.now()}`
        );
        break;
      case 'payment-qr':
        url = await uploadPaymentQR(body.base64Data, connectionId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid upload type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, url });
  });
}