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
  /** Products list - 2 minutes */
  PRODUCTS: 120,
  /** Customers list - 2 minutes */
  CUSTOMERS: 120,
  /** Sales list - 1 minute (changes more frequently) */
  SALES: 60,
  /** Transactions list - 1 minute */
  TRANSACTIONS: 60,
  /** Inventory report - 5 minutes */
  REPORT: 300,
  /** User spreadsheets list - 5 minutes */
  SPREADSHEETS: 300,
  /** Spreadsheet metadata - 10 minutes */
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

/**
 * Generate cache key
 */
export function getCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`;
}

/**
 * Get data from cache
 */
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

/**
 * Set data in cache with TTL
 */
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

/**
 * Invalidate (delete) cache entry
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
    console.log(`[Cache] INVALIDATED: ${key}`);
  } catch (error) {
    console.error('[Cache] Error invalidating cache:', error);
  }
}

/**
 * Invalidate multiple cache entries by pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    // Get all keys matching pattern
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
 * Invalidate all cache for a specific spreadsheet
 */
export async function invalidateSpreadsheetCache(spreadsheetId: string): Promise<void> {
  const patterns = [
    getCacheKey(CACHE_PREFIX.PRODUCTS, spreadsheetId),
    getCacheKey(CACHE_PREFIX.CUSTOMERS, spreadsheetId),
    getCacheKey(CACHE_PREFIX.SALES, spreadsheetId),
    getCacheKey(CACHE_PREFIX.TRANSACTIONS, spreadsheetId),
    getCacheKey(CACHE_PREFIX.REPORT, spreadsheetId),
    getCacheKey(CACHE_PREFIX.METADATA, spreadsheetId),
  ];

  for (const key of patterns) {
    await invalidateCache(key);
  }
}

/**
 * Get or fetch with cache
 * If data exists in cache, return it. Otherwise, fetch and cache.
 */
export async function getOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  // Try to get from cache first
  const cached = await getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  console.log(`[Cache] MISS: ${key} - Fetching fresh data`);
  const data = await fetchFn();

  // Cache the result
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
const BATCH_DELAY_MS = 100; // Wait 100ms to batch writes

/**
 * Batch similar writes together
 * Writes to the same spreadsheet within BATCH_DELAY_MS are batched
 */
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

    // Add to pending writes for this batch key
    if (!pendingWrites.has(batchKey)) {
      pendingWrites.set(batchKey, []);
      
      // Schedule batch execution
      setTimeout(async () => {
        const writes = pendingWrites.get(batchKey) || [];
        pendingWrites.delete(batchKey);

        // Execute all writes sequentially
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
// CACHE STATS (for monitoring)
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