import QRCode from 'qrcode';

/**
 * Generate QR code from eSewa payment data
 * Returns base64 data URL
 */
export async function generateEsewaQR(data: {
  esewaId: string;
  amount?: number;
  productId?: string;
}): Promise<string> {
  try {
    // eSewa deep link format
    const esewaUrl = `esewa://pay?scd=${data.esewaId}&amt=${data.amount || 0}&pid=${data.productId || 'SHEETCON'}`;
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(esewaUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrDataUrl;
  } catch (error: any) {
    console.error('QR generation error:', error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Generate generic payment QR (for other data)
 */
export async function generatePaymentQR(data: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
    });

    return qrDataUrl;
  } catch (error: any) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}