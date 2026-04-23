// app/api/admin/qr-images/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/security/authorization';
import { handleApiError, Errors } from '@/lib/security/errors';
import { uploadQRCode } from '@/lib/cloudinary';

// GET — list all QR images
export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    await requireAdmin(['SUPER_ADMIN', 'ADMIN']);

    const images = await prisma.qrImage.findMany({
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({ images });
  });
}

// POST — upload a new QR image
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    await requireAdmin(['SUPER_ADMIN', 'ADMIN']);

    const body = await request.json();
    const { label, imageBase64 } = body;

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      throw Errors.invalidInput('Label is required.');
    }
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw Errors.invalidInput('Image is required.');
    }

    // Validate base64 is an image
    if (!imageBase64.startsWith('data:image/')) {
      throw Errors.invalidInput('File must be an image (JPG or PNG).');
    }

    // Rough size check — base64 is ~1.37x original, 5MB original = ~6.85MB base64
    const base64Data = imageBase64.split(',')[1] || '';
    const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
    if (sizeBytes > 5 * 1024 * 1024) {
      throw Errors.invalidInput('Image must be less than 5MB.');
    }

    // Upload to Cloudinary
    const imageUrl = await uploadQRCode(imageBase64);

    const image = await prisma.qrImage.create({
      data: {
        label: label.trim(),
        imageUrl,
        isActive: false,
      },
    });

    return NextResponse.json({ success: true, image });
  });
}