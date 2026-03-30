// lib/auth-helpers.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/admin-login');  // ← CHANGED THIS
  }
  
  return session;
}

export async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session?.user;
}