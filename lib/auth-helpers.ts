// lib/auth-helpers.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

/**
 * Get admin session (for use in pages, not API routes)
 * For API routes, use requireAdmin from lib/security
 */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }
  
  const user = session.user as any;
  
  // Verify this is an admin
  if (user.type !== 'admin') {
    return null;
  }
  
  return session;
}

/**
 * Require admin for server components (pages)
 * Returns session if valid, redirects otherwise
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/admin-login');
  }
  
  const user = session.user as any;
  
  if (user.type !== 'admin') {
    redirect('/admin-login');
  }
  
  // Verify admin exists and is active
  const admin = await prisma.admin.findUnique({
    where: { email: user.email },
    select: { id: true, isActive: true, role: true },
  });
  
  if (!admin || !admin.isActive) {
    redirect('/admin-login');
  }
  
  return session;
}

// Alias for clarity (same function)
export const requireAdminPage = requireAdmin;

/**
 * Require user for server components
 */
export async function requireUserPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/login');
  }
  
  const user = session.user as any;
  
  if (user.type === 'admin') {
    redirect('/admin');
  }
  
  // Verify user exists and is not banned
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { tier: true },
  });
  
  if (!dbUser || !dbUser.isActive || dbUser.isBanned) {
    redirect('/login');
  }
  
  return { session, user: dbUser };
}

/**
 * Check if current session is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }
  
  return (session.user as any).type === 'admin';
}