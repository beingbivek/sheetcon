// lib/security/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';
import { Errors } from './errors';

/**
 * Rate limiting configuration using Upstash Redis
 * Implements IP-based and User-based rate limiting
 */

// ═══════════════════════════════════════════════════
// REDIS CLIENT
// ═══════════════════════════════════════════════════

// Lazy initialization to handle missing env vars gracefully
let redis: Redis | null = null;
let rateLimitersCache: Map<string, Ratelimit> = new Map();

function getRedis(): Redis | null {
  if (redis) return redis;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.warn('[Rate Limit] Upstash Redis not configured. Rate limiting disabled.');
    return null;
  }
  
  redis = new Redis({ url, token });
  return redis;
}

// ═══════════════════════════════════════════════════
// RATE LIMIT CONFIGURATIONS
// ═══════════════════════════════════════════════════

export type RateLimitTier = 'strict' | 'standard' | 'relaxed' | 'api' | 'auth' | 'pdf';

const RATE_LIMITS: Record<RateLimitTier, { requests: number; window: string }> = {
  // Strict: For sensitive operations (login, password change)
  strict: { requests: 5, window: '1m' },
  
  // Standard: For regular API calls
  standard: { requests: 60, window: '1m' },
  
  // Relaxed: For read-heavy operations
  relaxed: { requests: 120, window: '1m' },
  
  // API: For Google Sheets operations (cost consideration)
  api: { requests: 30, window: '1m' },
  
  // Auth: For authentication endpoints
  auth: { requests: 10, window: '5m' },
  
  // PDF: For PDF generation (expensive)
  pdf: { requests: 10, window: '10m' },
};

// ═══════════════════════════════════════════════════
// RATE LIMITER FACTORY
// ═══════════════════════════════════════════════════

function createRateLimiter(tier: RateLimitTier): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;
  
  // Check cache
  const cached = rateLimitersCache.get(tier);
  if (cached) return cached;
  
  const config = RATE_LIMITS[tier];
  const windowMs = parseWindow(config.window);
  
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.requests, `${windowMs}ms`),
    analytics: true,
    prefix: `sheetcon:ratelimit:${tier}`,
  });
  
  rateLimitersCache.set(tier, limiter);
  return limiter;
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)(s|m|h)$/);
  if (!match) return 60000; // Default 1 minute
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return 60000;
  }
}

// ═══════════════════════════════════════════════════
// IP EXTRACTION
// ═══════════════════════════════════════════════════

export function getClientIp(request: NextRequest): string {
  // Try various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback
  return 'unknown';
}

// ═══════════════════════════════════════════════════
// RATE LIMIT FUNCTIONS
// ═══════════════════════════════════════════════════

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Apply IP-based rate limiting
 */
export async function checkIpRateLimit(
  request: NextRequest,
  tier: RateLimitTier = 'standard'
): Promise<RateLimitResult> {
  const limiter = createRateLimiter(tier);
  
  if (!limiter) {
    // Rate limiting disabled, allow all
    return { success: true, limit: 999, remaining: 999, reset: 0 };
  }
  
  const ip = getClientIp(request);
  const identifier = `ip:${ip}`;
  
  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Apply user-based rate limiting
 */
export async function checkUserRateLimit(
  userId: string,
  tier: RateLimitTier = 'standard'
): Promise<RateLimitResult> {
  const limiter = createRateLimiter(tier);
  
  if (!limiter) {
    return { success: true, limit: 999, remaining: 999, reset: 0 };
  }
  
  const identifier = `user:${userId}`;
  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Combined rate limiting (IP + User)
 * Both must pass for the request to proceed
 */
export async function checkDualRateLimit(
  request: NextRequest,
  userId: string | null,
  tier: RateLimitTier = 'standard'
): Promise<RateLimitResult> {
  // Always check IP
  const ipResult = await checkIpRateLimit(request, tier);
  if (!ipResult.success) {
    return ipResult;
  }
  
  // If user is authenticated, also check user limit
  if (userId) {
    const userResult = await checkUserRateLimit(userId, tier);
    if (!userResult.success) {
      return userResult;
    }
    
    // Return the more restrictive result
    return userResult.remaining < ipResult.remaining ? userResult : ipResult;
  }
  
  return ipResult;
}

/**
 * Rate limit check that throws on failure
 * Use this in API routes
 */
export async function requireRateLimit(
  request: NextRequest,
  userId: string | null = null,
  tier: RateLimitTier = 'standard'
): Promise<void> {
  const result = await checkDualRateLimit(request, userId, tier);
  
  if (!result.success) {
    throw Errors.rateLimited();
  }
}

// ═══════════════════════════════════════════════════
// RATE LIMIT HEADERS
// ═══════════════════════════════════════════════════

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
}