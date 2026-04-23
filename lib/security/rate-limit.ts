// lib/security/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';
import { Errors } from './errors';

/**
 * Rate limiting configuration using Upstash Redis
 * Implements IP-based and User-based rate limiting
 * Fails OPEN if Redis is unavailable (degraded mode)
 */

// ═══════════════════════════════════════════════════
// REDIS CLIENT
// ═══════════════════════════════════════════════════

let redis: Redis | null = null;
let rateLimitersCache: Map<string, Ratelimit> = new Map();
// Track if Redis is known-dead to avoid hammering it on every request
let redisAvailable: boolean | null = null; // null = untested
let lastRedisCheck: number = 0;
const REDIS_RETRY_INTERVAL_MS = 60 * 1000; // Re-test every 60 seconds

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[Rate Limit] Upstash Redis not configured. Rate limiting disabled.');
    return null;
  }

  if (!redis) {
    redis = new Redis({ url, token });
  }

  return redis;
}

// ═══════════════════════════════════════════════════
// REDIS HEALTH CHECK
// ═══════════════════════════════════════════════════

/**
 * Ping Redis to verify it is reachable.
 * Updates the module-level `redisAvailable` flag.
 * Called lazily — only when the cached state is stale.
 */
async function checkRedisHealth(): Promise<boolean> {
  const now = Date.now();

  // Use cached result if recent enough
  if (redisAvailable !== null && now - lastRedisCheck < REDIS_RETRY_INTERVAL_MS) {
    return redisAvailable;
  }

  const client = getRedis();
  if (!client) {
    redisAvailable = false;
    lastRedisCheck = now;
    return false;
  }

  try {
    await client.ping();
    if (!redisAvailable) {
      // Was down, now up
      console.info('[Rate Limit] Redis connection restored.');
      // Clear stale limiters so they are recreated with fresh client
      rateLimitersCache.clear();
    }
    redisAvailable = true;
  } catch (err) {
    if (redisAvailable !== false) {
      // Log only on state change (down → still down is silent)
      console.warn(
        '[Rate Limit] Redis unavailable. Rate limiting disabled until connection restored.',
        err instanceof Error ? err.message : String(err)
      );
    }
    redisAvailable = false;
  }

  lastRedisCheck = now;
  return redisAvailable;
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
  if (!match) return 60000;

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
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  return 'unknown';
}

// ═══════════════════════════════════════════════════
// RATE LIMIT RESULT TYPE
// ═══════════════════════════════════════════════════

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/** Returned when Redis is unavailable — always allows the request through */
const DISABLED_RESULT: RateLimitResult = {
  success: true,
  limit: 999,
  remaining: 999,
  reset: 0,
};

// ═══════════════════════════════════════════════════
// CORE LIMIT HELPERS
// ═══════════════════════════════════════════════════

/**
 * Run a single limiter.limit() call safely.
 * If Redis throws for any reason (archived, network error, timeout),
 * we fail OPEN and log a warning. We never crash the request.
 */
async function safeLimitCheck(
  limiter: Ratelimit,
  identifier: string,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    // Mark Redis as unavailable so subsequent calls skip it immediately
    redisAvailable = false;
    lastRedisCheck = Date.now();
    console.warn(
      `[Rate Limit] Redis error on limit check (tier=${tier}, id=${identifier}). Failing open.`,
      err instanceof Error ? err.message : String(err)
    );
    return DISABLED_RESULT;
  }
}

// ═══════════════════════════════════════════════════
// PUBLIC RATE LIMIT FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Apply IP-based rate limiting
 */
export async function checkIpRateLimit(
  request: NextRequest,
  tier: RateLimitTier = 'standard'
): Promise<RateLimitResult> {
  // Check Redis health first (uses cached result, fast path)
  const healthy = await checkRedisHealth();
  if (!healthy) return DISABLED_RESULT;

  const limiter = createRateLimiter(tier);
  if (!limiter) return DISABLED_RESULT;

  const ip = getClientIp(request);
  return safeLimitCheck(limiter, `ip:${ip}`, tier);
}

/**
 * Apply user-based rate limiting
 */
export async function checkUserRateLimit(
  userId: string,
  tier: RateLimitTier = 'standard'
): Promise<RateLimitResult> {
  const healthy = await checkRedisHealth();
  if (!healthy) return DISABLED_RESULT;

  const limiter = createRateLimiter(tier);
  if (!limiter) return DISABLED_RESULT;

  return safeLimitCheck(limiter, `user:${userId}`, tier);
}

/**
 * Combined rate limiting (IP + User).
 * Both must pass. If either fails, request is blocked.
 * If Redis is down, both return DISABLED_RESULT and request passes through.
 */
export async function checkDualRateLimit(
  request: NextRequest,
  userId: string | null,
  tier: RateLimitTier = 'standard'
): Promise<RateLimitResult> {
  const ipResult = await checkIpRateLimit(request, tier);
  if (!ipResult.success) return ipResult;

  if (userId) {
    const userResult = await checkUserRateLimit(userId, tier);
    if (!userResult.success) return userResult;

    // Return the more restrictive result
    return userResult.remaining < ipResult.remaining ? userResult : ipResult;
  }

  return ipResult;
}

/**
 * Rate limit check that throws ApiError on failure.
 * Use this in API routes.
 * NEVER throws due to Redis being unavailable — only throws if
 * Redis is healthy AND the user has genuinely exceeded their limit.
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