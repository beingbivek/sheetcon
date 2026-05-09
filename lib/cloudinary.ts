// lib/cloudinary.ts (COMPLETE REPLACEMENT)

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ═══════════════════════════════════════════════════
// SHARED VALIDATION
// ═══════════════════════════════════════════════════

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

function validateBase64(base64Data: string): void {
  const matches = base64Data.match(/^data:image\/(\w+);base64,/);
  if (!matches) throw new Error('Invalid image format. Must be a base64 data URL.');
  const format = matches[1].toLowerCase();
  if (!ALLOWED_FORMATS.includes(format)) {
    throw new Error(`Unsupported format: ${format}. Allowed: ${ALLOWED_FORMATS.join(', ')}`);
  }
  const base64String = base64Data.split(',')[1] ?? '';
  const sizeInBytes = Math.ceil((base64String.length * 3) / 4);
  if (sizeInBytes > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5MB.');
  }
}

// ═══════════════════════════════════════════════════
// PAYMENT PROOFS
// ═══════════════════════════════════════════════════

export async function uploadPaymentProof(
  base64Data: string,
  invoiceId: string
): Promise<string> {
  try {
    validateBase64(base64Data);
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/payment-proofs',
      public_id: `proof_${invoiceId}_${Date.now()}`,
      resource_type: 'image',
      allowed_formats: ALLOWED_FORMATS,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    });
    return result.secure_url;
  } catch (error: any) {
    console.error('[Cloudinary] uploadPaymentProof error:', error);
    throw new Error(`Failed to upload payment proof: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════
// QR CODES
// ═══════════════════════════════════════════════════

export async function uploadQRCode(base64Data: string): Promise<string> {
  try {
    validateBase64(base64Data);
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/qr-codes',
      public_id: `esewa_qr_${Date.now()}`,
      resource_type: 'image',
      overwrite: true,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto:best' },
      ],
    });
    return result.secure_url;
  } catch (error: any) {
    console.error('[Cloudinary] uploadQRCode error:', error);
    throw new Error(`Failed to upload QR code: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════
// BUSINESS MANAGEMENT TEMPLATE IMAGES
// ═══════════════════════════════════════════════════

export async function uploadProductImage(
  base64Data: string,
  productId: string
): Promise<string> {
  try {
    validateBase64(base64Data);
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/product-images',
      public_id: `product_${productId}_${Date.now()}`,
      resource_type: 'image',
      allowed_formats: ALLOWED_FORMATS,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    });
    return result.secure_url;
  } catch (error: any) {
    console.error('[Cloudinary] uploadProductImage error:', error);
    throw new Error(`Failed to upload product image: ${error.message}`);
  }
}

export async function uploadBusinessLogo(
  base64Data: string,
  connectionId: string
): Promise<string> {
  try {
    validateBase64(base64Data);
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/business-logos',
      public_id: `logo_${connectionId}`,
      resource_type: 'image',
      allowed_formats: ALLOWED_FORMATS,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'limit' },
        { quality: 'auto:best' },
      ],
    });
    return result.secure_url;
  } catch (error: any) {
    console.error('[Cloudinary] uploadBusinessLogo error:', error);
    throw new Error(`Failed to upload business logo: ${error.message}`);
  }
}

export async function uploadBillImage(
  base64Data: string,
  invoiceId: string
): Promise<string> {
  try {
    validateBase64(base64Data);
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/bill-images',
      public_id: `bill_${invoiceId}_${Date.now()}`,
      resource_type: 'image',
      allowed_formats: ALLOWED_FORMATS,
      transformation: [
        { width: 1200, height: 1600, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    });
    return result.secure_url;
  } catch (error: any) {
    console.error('[Cloudinary] uploadBillImage error:', error);
    throw new Error(`Failed to upload bill image: ${error.message}`);
  }
}

export async function uploadPurchaseBillImage(
  base64Data: string,
  purchaseId: string
): Promise<string> {
  try {
    validateBase64(base64Data);
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/purchase-bills',
      public_id: `purchase_bill_${purchaseId}_${Date.now()}`,
      resource_type: 'image',
      allowed_formats: ALLOWED_FORMATS,
      transformation: [
        { width: 1200, height: 1600, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    });
    return result.secure_url;
  } catch (error: any) {
    console.error('[Cloudinary] uploadPurchaseBillImage error:', error);
    throw new Error(`Failed to upload purchase bill image: ${error.message}`);
  }
}

export async function uploadPaymentQR(
  base64Data: string,
  connectionId: string
): Promise<string> {
  try {
    validateBase64(base64Data);
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/payment-qr',
      public_id: `payment_qr_${connectionId}`,
      resource_type: 'image',
      allowed_formats: ALLOWED_FORMATS,
      overwrite: true,
      transformation: [
        { width: 600, height: 600, crop: 'limit' },
        { quality: 'auto:best' },
      ],
    });
    return result.secure_url;
  } catch (error: any) {
    console.error('[Cloudinary] uploadPaymentQR error:', error);
    throw new Error(`Failed to upload payment QR: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════

export async function deleteImage(publicIdOrUrl: string): Promise<void> {
  try {
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.startsWith('http')) {
      const parts = publicIdOrUrl.split('/');
      const uploadIdx = parts.indexOf('upload');
      if (uploadIdx !== -1) {
        const withVersion = parts.slice(uploadIdx + 1).join('/');
        publicId = withVersion.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
      }
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('[Cloudinary] deleteImage error:', error);
  }
}

export default cloudinary;