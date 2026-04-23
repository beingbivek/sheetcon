// app/api/admin/payment-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/security/authorization';
import { handleApiError } from '@/lib/security/errors';
import { updatePaymentSettingsSchema } from '@/lib/validation/payment-schemas';
import { generateEsewaQR } from '@/lib/qr-generator';
import { uploadQRCode } from '@/lib/cloudinary';

export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    // Allow regular users too (read-only)
    const settings = await prisma.paymentSettings.findFirst({
      where: { isActive: true },
    });

    return NextResponse.json({ settings });
  });
}

export async function PUT(request: NextRequest) {
  return handleApiError(async () => {
    await requireAdmin(['SUPER_ADMIN', 'ADMIN']);

    const body = await request.json();
    const data = updatePaymentSettingsSchema.parse(body);

    // Generate QR code if data provided
    let qrImageUrl: string | undefined;
    if (data.qrCodeData) {
      const qrDataUrl = await generateEsewaQR(JSON.parse(data.qrCodeData));
      qrImageUrl = await uploadQRCode(qrDataUrl);
    }

    // Upsert settings
    const existing = await prisma.paymentSettings.findFirst();

    if (existing) {
      const updated = await prisma.paymentSettings.update({
        where: { id: existing.id },
        data: {
          ...data,
          qrImageUrl: qrImageUrl || existing.qrImageUrl,
        },
      });
      return NextResponse.json({ success: true, settings: updated });
    } else {
      const created = await prisma.paymentSettings.create({
        data: {
          ...data,
          qrImageUrl: qrImageUrl || '',
        },
      });
      return NextResponse.json({ success: true, settings: created });
    }
  });
}