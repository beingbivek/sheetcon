// lib/security/validation.ts

import { z } from 'zod';
import { Errors } from './errors';

/**
 * Zod Schemas for all data entities
 * Ensures type-safe, validated input across all API routes
 */

// ═══════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════

export const idSchema = z.string().cuid();

export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

export const positiveNumberSchema = z.number().min(0, 'Must be a positive number');

export const nonEmptyStringSchema = z.string().min(1, 'Cannot be empty').trim();

// ═══════════════════════════════════════════════════
// USER SCHEMAS
// ═══════════════════════════════════════════════════

// What users can update about themselves (PROTECTED - no role, tier, etc.)
export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
}).strict(); // .strict() rejects unknown keys

// What admins can update about users
export const adminUserUpdateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: emailSchema.optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  tierId: idSchema.optional(),
  resetUsage: z.boolean().optional(),
}).strict();

// Ban user schema
export const banUserSchema = z.object({
  reason: z.string().min(1, 'Ban reason is required').max(500).trim(),
}).strict();

// ═══════════════════════════════════════════════════
// TIER SCHEMAS
// ═══════════════════════════════════════════════════

export const tierCreateSchema = z.object({
  name: nonEmptyStringSchema.max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  currency: z.string().length(3).default('INR'),
  maxUsers: z.number().int().min(-1).default(-1),
  maxSheets: z.number().int().min(-1).default(1),
  maxTemplates: z.number().int().min(-1).default(1),
  maxCrudPerDay: z.number().int().min(-1).default(1000),
  customBranding: z.boolean().default(false),
  prioritySupport: z.boolean().default(false),
  exportToPdf: z.boolean().default(true),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
}).strict();

export const tierUpdateSchema = tierCreateSchema.partial().strict();

// ═══════════════════════════════════════════════════
// TEMPLATE SCHEMAS
// ═══════════════════════════════════════════════════

export const templateCreateSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  name: nonEmptyStringSchema.max(100),
  description: z.string().max(1000).optional(),
  icon: z.string().max(10).default('📋'),
  configSchema: z.record(z.any()),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3b82f6'),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  version: z.string().default('1.0.0'),
}).strict();

export const templateUpdateSchema = templateCreateSchema.partial().strict();

// ═══════════════════════════════════════════════════
// SHEET CONNECTION SCHEMAS
// ═══════════════════════════════════════════════════

export const sheetConnectSchema = z.object({
  method: z.enum(['create', 'existing']),
  sheetId: z.string().optional(),
  sheetName: z.string().max(200).optional(),
  templateId: z.enum(['finance', 'inventory']),
}).strict().refine(
  (data) => data.method === 'create' || !!data.sheetId,
  { message: 'Sheet ID is required when using existing sheet' }
);

// ═══════════════════════════════════════════════════
// FINANCE SCHEMAS
// ═══════════════════════════════════════════════════

export const transactionTypeSchema = z.enum(['income', 'expense']);

export const transactionCreateSchema = z.object({
  date: dateSchema,
  description: nonEmptyStringSchema.max(500),
  category: nonEmptyStringSchema.max(100),
  type: transactionTypeSchema,
  amount: z.number().positive('Amount must be positive'),
}).strict();

export const transactionUpdateSchema = transactionCreateSchema.partial().strict();

// ═══════════════════════════════════════════════════
// INVENTORY SCHEMAS
// ═══════════════════════════════════════════════════

// Product
export const productCreateSchema = z.object({
  name: nonEmptyStringSchema.max(200),
  sku: z.string().max(50).optional().default(''),
  category: z.string().max(100).optional().default(''),
  description: z.string().max(1000).optional().default(''),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  unit: z.string().max(20).default('pcs'),
}).strict();

export const productUpdateSchema = productCreateSchema.partial().strict();

// Customer
export const customerCreateSchema = z.object({
  name: nonEmptyStringSchema.max(200),
  phone: z.string().max(20).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  address: z.string().max(500).optional().default(''),
  city: z.string().max(100).optional().default(''),
  notes: z.string().max(1000).optional().default(''),
}).strict();

export const customerUpdateSchema = customerCreateSchema.partial().strict();

// Sale Item
export const saleItemSchema = z.object({
  productId: nonEmptyStringSchema,
  productName: nonEmptyStringSchema,
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
});

// Sale/Invoice
export const paymentMethodSchema = z.enum(['CASH', 'WALLET', 'BANK', 'CREDIT']);
export const paymentStatusSchema = z.enum(['PAID', 'PARTIAL', 'UNPAID']);

export const saleCreateSchema = z.object({
  date: dateSchema.optional(),
  customerId: nonEmptyStringSchema,
  customerName: z.string().max(200).optional().default(''),
  customerPhone: z.string().max(20).optional().default(''),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  discountPercent: z.number().min(0).max(100).default(0),
  taxPercent: z.number().min(0).max(100).default(0),
  paymentMethod: paymentMethodSchema.default('CASH'),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().max(1000).optional().default(''),
}).strict();

export const salePaymentUpdateSchema = z.object({
  amountPaid: z.number().positive('Amount must be positive'),
  paymentMethod: paymentMethodSchema.default('CASH'),
}).strict();

// ═══════════════════════════════════════════════════
// ADMIN SCHEMAS
// ═══════════════════════════════════════════════════

export const adminProfileUpdateSchema = z.object({
  name: nonEmptyStringSchema.max(100),
}).strict();

export const adminPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).strict();

// ═══════════════════════════════════════════════════
// VALIDATION HELPER
// ═══════════════════════════════════════════════════

/**
 * Validate data against a Zod schema
 * Throws ApiError with validation details on failure
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    
    throw Errors.validation(errors);
  }
  
  return result.data;
}

/**
 * Sanitize string input (trim, remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Max length to prevent DOS
}

/**
 * Sanitize object - apply to all string fields
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}