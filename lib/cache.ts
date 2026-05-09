// lib/cache.ts

import { Redis } from '@upstash/redis';

// ═══════════════════════════════════════════════════
// REDIS CLIENT
// ═══════════════════════════════════════════════════

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ═══════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════

export const CACHE_TTL = {
  PRODUCTS: 120,
  CUSTOMERS: 120,
  SALES: 60,
  TRANSACTIONS: 60,
  REPORT: 300,
  SPREADSHEETS: 300,
  METADATA: 600,
} as const;

export const CACHE_PREFIX = {
  PRODUCTS: 'sheets:products',
  CUSTOMERS: 'sheets:customers',
  SALES: 'sheets:sales',
  TRANSACTIONS: 'sheets:transactions',
  REPORT: 'sheets:report',
  SPREADSHEETS: 'drive:spreadsheets',
  METADATA: 'sheets:metadata',
} as const;

// ═══════════════════════════════════════════════════
// CACHE FUNCTIONS
// ═══════════════════════════════════════════════════

export function getCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<T>(key);
    if (data) {
      console.log(`[Cache] HIT: ${key}`);
    }
    return data;
  } catch (error) {
    console.error('[Cache] Error reading from cache:', error);
    return null;
  }
}

export async function setInCache<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.set(key, data, { ex: ttlSeconds });
    console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('[Cache] Error writing to cache:', error);
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
    console.log(`[Cache] INVALIDATED: ${key}`);
  } catch (error) {
    console.error('[Cache] Error invalidating cache:', error);
  }
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Cache] INVALIDATED ${keys.length} keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('[Cache] Error invalidating cache pattern:', error);
  }
}

/**
 * Invalidate all cache for a specific spreadsheet.
 * Covers both base keys (finance/inventory templates)
 * and suffixed keys (business-management template).
 */
export async function invalidateSpreadsheetCache(
  spreadsheetId: string
): Promise<void> {
  try {
    const allKeys = [
      // ── Base keys (finance / inventory templates) ──
      getCacheKey(CACHE_PREFIX.PRODUCTS, spreadsheetId),
      getCacheKey(CACHE_PREFIX.CUSTOMERS, spreadsheetId),
      getCacheKey(CACHE_PREFIX.SALES, spreadsheetId),
      getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId),
      getCacheKey(CACHE_PREFIX.REPORT, spreadsheetId),
      getCacheKey(CACHE_PREFIX.METADATA, spreadsheetId),

      // ── Suffixed keys (business-management template) ──
      getCacheKey(CACHE_PREFIX.PRODUCTS, spreadsheetId, 'biz-products'),
      getCacheKey(CACHE_PREFIX.CUSTOMERS, spreadsheetId, 'biz-suppliers'),
      getCacheKey(CACHE_PREFIX.CUSTOMERS, spreadsheetId, 'biz-customers'),
      getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId, 'biz-purchases'),
      getCacheKey(CACHE_PREFIX.SALES, spreadsheetId, 'biz-sales'),
      getCacheKey(CACHE_PREFIX.METADATA, spreadsheetId, 'biz-config'),
    ];

    for (const key of allKeys) {
      await invalidateCache(key);
    }
  } catch (error) {
    console.error('[Cache] Error invalidating spreadsheet cache:', error);
  }
}

export async function getOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  console.log(`[Cache] MISS: ${key} - Fetching fresh data`);
  const data = await fetchFn();
  await setInCache(key, data, ttlSeconds);
  return data;
}

// ═══════════════════════════════════════════════════
// WRITE BATCHING
// ═══════════════════════════════════════════════════

interface PendingWrite {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

const pendingWrites = new Map<string, PendingWrite[]>();
const BATCH_DELAY_MS = 100;

export async function batchWrite<T>(
  batchKey: string,
  operation: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const writeId = `${Date.now()}-${Math.random()}`;

    const pendingWrite: PendingWrite = {
      id: writeId,
      operation,
      resolve,
      reject,
      timestamp: Date.now(),
    };

    if (!pendingWrites.has(batchKey)) {
      pendingWrites.set(batchKey, []);

      setTimeout(async () => {
        const writes = pendingWrites.get(batchKey) || [];
        pendingWrites.delete(batchKey);

        for (const write of writes) {
          try {
            const result = await write.operation();
            write.resolve(result);
          } catch (error) {
            write.reject(error);
          }
        }
      }, BATCH_DELAY_MS);
    }

    pendingWrites.get(batchKey)!.push(pendingWrite);
  });
}

// ═══════════════════════════════════════════════════
// CACHE STATS
// ═══════════════════════════════════════════════════

export async function getCacheStats(): Promise<{
  totalKeys: number;
  memoryUsage: string;
}> {
  try {
    const keys = await redis.keys('sheets:*');
    const driveKeys = await redis.keys('drive:*');

    return {
      totalKeys: keys.length + driveKeys.length,
      memoryUsage: 'N/A (Upstash)',
    };
  } catch (error) {
    return {
      totalKeys: 0,
      memoryUsage: 'Error',
    };
  }
}