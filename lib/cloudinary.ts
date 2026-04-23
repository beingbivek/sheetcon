import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload base64 image to Cloudinary
 * Used for payment proof screenshots
 */
export async function uploadPaymentProof(
  base64Data: string,
  invoiceId: string
): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/payment-proofs',
      public_id: `proof_${invoiceId}_${Date.now()}`,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_file_size: 5 * 1024 * 1024, // 5MB
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Limit max dimensions
        { quality: 'auto:good' }, // Auto quality optimization
      ],
    });

    return result.secure_url;
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Upload QR code image to Cloudinary
 * Used for payment settings QR codes
 */
export async function uploadQRCode(
  base64Data: string
): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'sheetcon/qr-codes',
      public_id: `esewa_qr_${Date.now()}`,
      resource_type: 'image',
      overwrite: true,
    });

    return result.secure_url;
  } catch (error: any) {
    console.error('Cloudinary QR upload error:', error);
    throw new Error(`Failed to upload QR code: ${error.message}`);
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete image:', error);
  }
}

export default cloudinary;