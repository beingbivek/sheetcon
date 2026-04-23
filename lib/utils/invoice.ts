/**
 * Generate unique invoice ID
 * Format: SC-YYYYMMDD-XXXXX
 */
export function generateInvoiceId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `SC-${year}${month}${day}-${random}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'NPR'): string {
  if (currency === 'NPR') {
    return `NPR ${amount.toLocaleString('en-NP')}`;
  }
  return `${currency} ${amount}`;
}