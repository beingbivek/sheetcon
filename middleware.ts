// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js Middleware for route protection and security
 * 
 * IMPORTANT: API routes (/api/**) are NOT protected here.
 * They handle their own auth via requireAuth() / requireAdmin().
 * Middleware only protects page routes.
 */

const publicPaths = [
  '/',
  '/login',
  '/admin-login',
  '/register',
];

const adminPaths = ['/admin'];
const userPaths = ['/dashboard'];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some(path => {
    if (pathname === path) return true;
    if (pathname.startsWith(path + '/')) return true;
    return false;
  });
}

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => {
    if (pathname === path) return true;
    if (pathname.startsWith(path + '/')) return true;
    return false;
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Skip Next.js internals & static files ───────────────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||   // ← ALL API routes handle their own auth
    pathname.includes('.')            // static files (favicon.ico, etc.)
  ) {
    return NextResponse.next();
  }

  // ─── Public pages: add security headers, allow through ───────────────────
  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // ─── Get session token ────────────────────────────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAdminRoute = matchesPath(pathname, adminPaths);
  const isUserRoute  = matchesPath(pathname, userPaths);
  const isProtectedRoute = isAdminRoute || isUserRoute;

  // ─── Not authenticated ────────────────────────────────────────────────────
  if (!token) {
    if (isProtectedRoute) {
      const redirectUrl = isAdminRoute ? '/admin-login' : '/login';
      const url = new URL(redirectUrl, request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // ─── Authenticated ────────────────────────────────────────────────────────
  const userType = (token as any).type as string | undefined;

  // Wrong type trying to access wrong portal → redirect to correct portal
  if (isUserRoute && userType === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  if (isAdminRoute && userType !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Already logged-in users hitting login pages
  if (pathname === '/login' && userType === 'user') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (pathname === '/admin-login' && userType === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  } else {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};