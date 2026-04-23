import { z } from 'zod';

/**
 * Validation schemas for payment system
 */

export const createPaymentRequestSchema = z.object({
  tierId: z.string().cuid(),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
});

export const submitPaymentProofSchema = z.object({
  screenshotBase64: z.string().min(100, 'Screenshot is required'),
  transactionReference: z.string().min(3, 'Transaction reference is required').max(100),
  payerAccount: z.string().min(3, 'Payer account is required').max(100),
  userNote: z.string().max(500).optional(),
});

export const reviewPaymentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNote: z.string().max(500).optional(),
  rejectionReason: z.string().max(500).optional(),
});

export const updatePaymentSettingsSchema = z.object({
  esewaId: z.string().min(3).max(50),
  esewaName: z.string().min(3).max(100),
  esewaPhone: z.string().max(20).optional(),
  qrCodeData: z.string().optional(),
  instructions: z.string().min(10).max(1000),
});

// Type exports
export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
export type UpdatePaymentSettingsInput = z.infer<typeof updatePaymentSettingsSchema>;