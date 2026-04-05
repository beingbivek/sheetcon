// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js Middleware for route protection and security
 */

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/admin'];

// Routes that require admin access
const adminRoutes = ['/admin'];

// Public routes (no auth needed)
const publicRoutes = ['/', '/login', '/admin-login', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip static files and API routes (API routes handle their own auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }
  
  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Check if route requires protection
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  
  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !token) {
    const redirectUrl = isAdminRoute ? '/admin-login' : '/login';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  
  // Check admin access
  if (isAdminRoute && token) {
    const userType = (token as any).type;
    if (userType !== 'admin') {
      // Non-admin trying to access admin routes
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Check user access to dashboard
  if (pathname.startsWith('/dashboard') && token) {
    const userType = (token as any).type;
    if (userType === 'admin') {
      // Admin trying to access user dashboard
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  
  // Redirect authenticated users away from login pages
  if (token) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (pathname === '/admin-login' && (token as any).type === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  
  // Add security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};