// lib/auth-helpers.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Get the current admin session
 * Returns null if not logged in
 */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  return session;
}

/**
 * Require admin authentication
 * Redirects to login if not authenticated
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/admin/login');
  }
  
  return session;
}

/**
 * Check if user is authenticated (use in components)
 */
export async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session?.user;
}