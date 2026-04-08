// lib/security/authorization.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Errors, ApiError, logError } from './errors';
import { NextRequest } from 'next/server';

/**
 * Authorization utilities for secure access control
 * Implements RBAC and ownership verification
 */

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  type: 'user' | 'admin';
  role?: string;
  tierId?: string;
  tierSlug?: string;
}

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  type: 'admin';
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
}

// ═══════════════════════════════════════════════════
// SESSION VERIFICATION
// ═══════════════════════════════════════════════════

/**
 * Get current session and verify authentication
 * Throws if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw Errors.unauthorized();
  }
  
  const user = session.user as any;
  
  // Check if user is banned (for regular users)
  if (user.type === 'user') {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, isBanned: true, isActive: true, tierId: true, tier: { select: { slug: true } } },
    });
    
    if (!dbUser) {
      throw Errors.notFound('User');
    }
    
    if (dbUser.isBanned || !dbUser.isActive) {
      throw new ApiError('FORBIDDEN', 'Your account has been suspended.');
    }
    
    return {
      id: dbUser.id,
      email: user.email,
      name: user.name,
      type: 'user',
      tierId: dbUser.tierId,
      tierSlug: dbUser.tier.slug,
    };
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    type: user.type || 'user',
    role: user.role,
  };
}

/**
 * Require admin authentication with role check
 */
export async function requireAdmin(
  allowedRoles: ('SUPER_ADMIN' | 'ADMIN' | 'SUPPORT')[] = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT']
): Promise<AuthenticatedAdmin> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw Errors.unauthorized();
  }
  
  const user = session.user as any;
  
  // Verify this is an admin session
  if (user.type !== 'admin') {
    throw Errors.forbidden();
  }
  
  // Verify admin exists and is active
  const admin = await prisma.admin.findUnique({
    where: { email: user.email },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  
  if (!admin || !admin.isActive) {
    throw Errors.forbidden();
  }
  
  // Check role permission
  if (!allowedRoles.includes(admin.role)) {
    throw new ApiError('FORBIDDEN', 'Insufficient permissions for this action.');
  }
  
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    type: 'admin',
    role: admin.role,
  };
}

/**
 * Require SUPER_ADMIN role (for sensitive operations like tier changes)
 */
export async function requireSuperAdmin(): Promise<AuthenticatedAdmin> {
  return requireAdmin(['SUPER_ADMIN']);
}

// ═══════════════════════════════════════════════════
// OWNERSHIP VERIFICATION (IDOR Prevention)
// ═══════════════════════════════════════════════════

/**
 * Verify user owns a sheet connection
 * Prevents IDOR attacks
 */
export async function verifySheetOwnership(
  userId: string,
  connectionId: string
): Promise<{
  connection: any;
  user: any;
}> {
  const connection = await prisma.sheetConnection.findFirst({
    where: {
      id: connectionId,
      userId: userId,
      isActive: true,
    },
    include: {
      user: {
        include: { tier: true },
      },
    },
  });
  
  if (!connection) {
    throw Errors.notFound('Sheet connection');
  }
  
  return {
    connection,
    user: connection.user,
  };
}

/**
 * Verify sheet ownership by email (when userId not available from session)
 */
export async function verifySheetOwnershipByEmail(
  userEmail: string,
  connectionId: string
): Promise<{
  connection: any;
  user: any;
}> {
  const connection = await prisma.sheetConnection.findFirst({
    where: {
      id: connectionId,
      user: { email: userEmail },
      isActive: true,
    },
    include: {
      user: {
        include: { tier: true },
      },
    },
  });
  
  if (!connection) {
    throw Errors.notFound('Sheet connection');
  }
  
  return {
    connection,
    user: connection.user,
  };
}

/**
 * Generic ownership check
 * Returns the resource if owned, throws if not
 */
export async function verifyOwnership<T>(
  model: 'sheetConnection' | 'user',
  resourceId: string,
  userId: string
): Promise<T> {
  let resource: any;
  
  switch (model) {
    case 'sheetConnection':
      resource = await prisma.sheetConnection.findFirst({
        where: { id: resourceId, userId },
      });
      break;
    case 'user':
      resource = await prisma.user.findFirst({
        where: { id: resourceId },
      });
      // For user model, verify the user is accessing their own data
      if (resource && resource.id !== userId) {
        throw Errors.ownershipRequired();
      }
      break;
  }
  
  if (!resource) {
    throw Errors.notFound();
  }
  
  return resource as T;
}

// ═══════════════════════════════════════════════════
// CRUD LIMIT VERIFICATION
// ═══════════════════════════════════════════════════

/**
 * Check and increment CRUD limit for user
 * Returns the user with updated count
 */

export async function checkAndIncrementCrudLimit(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tier: true },
  });
  
  if (!user) {
    throw Errors.notFound('User');
  }
  
  // Reset daily count if new day
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastReset = new Date(user.lastCrudReset);  // ← CORRECT FIELD NAME
  const lastResetDay = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
  
  let currentCount = user.crudCountToday;
  
  if (today > lastResetDay) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        crudCountToday: 1,
        lastCrudReset: now,  // ← CORRECT FIELD NAME
      },
    });
    return;
  }
  
  // Check limit
  if (user.tier.maxCrudPerDay !== -1 && currentCount >= user.tier.maxCrudPerDay) {
    throw Errors.crudLimit();
  }
  
  // Increment
  await prisma.user.update({
    where: { id: userId },
    data: { crudCountToday: { increment: 1 } },
  });
}

/**
 * Increment CRUD count (when operation succeeded)
 */
export async function incrementCrudCount(userId: string, count: number = 1): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { crudCountToday: { increment: count } },
  });
}

// ═══════════════════════════════════════════════════
// FEATURE ACCESS CHECK
// ═══════════════════════════════════════════════════

/**
 * Check if user has access to a specific feature
 */
export async function checkFeatureAccess(
  userId: string,
  feature: 'exportToPdf' | 'customBranding' | 'prioritySupport'
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tier: true },
  });
  
  if (!user) {
    return false;
  }
  
  return user.tier[feature];
}

/**
 * Require feature access (throws if not allowed)
 */
export async function requireFeatureAccess(
  userId: string,
  feature: 'exportToPdf' | 'customBranding' | 'prioritySupport'
): Promise<void> {
  const hasAccess = await checkFeatureAccess(userId, feature);
  
  if (!hasAccess) {
    throw new ApiError(
      'FORBIDDEN',
      `This feature requires an upgrade. Please upgrade your plan to access ${feature}.`
    );
  }
}

// ═══════════════════════════════════════════════════
// PROTECTED FIELDS FILTER
// ═══════════════════════════════════════════════════

/**
 * List of fields that regular users cannot modify
 * These require admin/system permissions
 */
const PROTECTED_USER_FIELDS = [
  'id',
  'email', // Can only be changed via OAuth
  'tierId',
  'googleId',
  'accessToken',
  'refreshToken',
  'tokenExpiresAt',
  'isActive',
  'isBanned',
  'banReason',
  'crudCountToday',
  'lastCrudResetAt',
  'emailVerified',
  'createdAt',
  'updatedAt',
];

/**
 * Filter out protected fields from user input
 * Prevents users from escalating privileges
 */
export function filterProtectedFields<T extends Record<string, any>>(
  data: T,
  protectedFields: string[] = PROTECTED_USER_FIELDS
): Partial<T> {
  const filtered: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!protectedFields.includes(key)) {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

/**
 * Ensure no protected fields are in the request
 * Throws if any protected field is found
 */
export function ensureNoProtectedFields(
  data: Record<string, any>,
  protectedFields: string[] = PROTECTED_USER_FIELDS
): void {
  const found = Object.keys(data).filter(key => protectedFields.includes(key));
  
  if (found.length > 0) {
    throw new ApiError(
      'FORBIDDEN',
      `Cannot modify protected fields: ${found.join(', ')}`
    );
  }
}