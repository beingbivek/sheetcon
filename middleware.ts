// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js Middleware for route protection and security
 */

// Public routes that should NEVER be protected (exact match or prefix)
const publicPaths = [
  '/',
  '/login',
  '/admin-login',
  '/register',
  '/api/auth',
];

// Routes that require admin access (exact or prefix with /)
const adminPaths = ['/admin'];

// Routes that require user access
const userPaths = ['/dashboard'];

/**
 * Check if pathname matches any of the given paths
 * Handles both exact matches and prefix matches correctly
 */
function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some(path => {
    // Exact match
    if (pathname === path) return true;
    // Prefix match (must be followed by / or end of string)
    // This prevents /admin-login from matching /admin
    if (pathname.startsWith(path + '/')) return true;
    return false;
  });
}

/**
 * Check if pathname is a public route
 */
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => {
    if (pathname === path) return true;
    if (pathname.startsWith(path + '/')) return true;
    // Special case for /api/auth which uses [...nextauth]
    if (path === '/api/auth' && pathname.startsWith('/api/auth')) return true;
    return false;
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') // Static files (has extension)
  ) {
    return NextResponse.next();
  }
  
  // ═══════════════════════════════════════════════════
  // CRITICAL: Check public routes FIRST (before token check)
  // This prevents infinite redirect loops!
  // ═══════════════════════════════════════════════════
  
  if (isPublicPath(pathname)) {
    // Still add security headers for public routes
    const response = NextResponse.next();
    addSecurityHeaders(response, request);
    return response;
  }
  
  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Check route types using correct matching
  const isAdminRoute = matchesPath(pathname, adminPaths);
  const isUserRoute = matchesPath(pathname, userPaths);
  const isProtectedRoute = isAdminRoute || isUserRoute;
  
  // ═══════════════════════════════════════════════════
  // UNAUTHENTICATED USERS
  // ═══════════════════════════════════════════════════
  
  if (!token) {
    if (isProtectedRoute) {
      const redirectUrl = isAdminRoute ? '/admin-login' : '/login';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    // Not a protected route and no token - allow access
    const response = NextResponse.next();
    addSecurityHeaders(response, request);
    return response;
  }
  
  // ═══════════════════════════════════════════════════
  // AUTHENTICATED USERS
  // ═══════════════════════════════════════════════════
  
  const userType = (token as any).type;
  
  // Prevent admins from accessing user dashboard
  if (isUserRoute && userType === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  // Prevent users from accessing admin routes
  if (isAdminRoute && userType !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Redirect authenticated users away from login pages
  if (pathname === '/login' && userType === 'user') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  if (pathname === '/admin-login' && userType === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  // Allow access
  const response = NextResponse.next();
  addSecurityHeaders(response, request);
  return response;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // X-Frame-Options: DENY in production, SAMEORIGIN in development
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  } else {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};