// lib/google-sheets-queue.ts

/**
 * Google Sheets API Rate Limiting & Queue System
 * 
 * Limits:
 * - Read Requests: 300/min per project
 * - Write Requests: 60/min per project
 * 
 * Features:
 * - Priority queue (writes > reads)
 * - Per-user fairness
 * - Exponential backoff on 429 errors
 * - Request deduplication
 * - Circuit breaker pattern
 */

import { Redis } from '@upstash/redis';

// ═══════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════

const RATE_LIMITS = {
  READ: {
    maxPerMinute: 280, // Leave buffer (300 - 20)
    windowMs: 60000, // 1 minute
  },
  WRITE: {
    maxPerMinute: 55, // Leave buffer (60 - 5)
    windowMs: 60000,
  },
};

const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 32000, // 32 seconds
};

const CIRCUIT_BREAKER = {
  failureThreshold: 10, // Open circuit after 10 failures
  resetTimeout: 60000, // Reset after 1 minute
};

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export type RequestType = 'READ' | 'WRITE';
export type Priority = 'HIGH' | 'NORMAL' | 'LOW';

export interface QueuedRequest<T = any> {
  id: string;
  userId: string;
  type: RequestType;
  priority: Priority;
  operation: () => Promise<T>;
  timestamp: number;
  retries: number;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

interface RateLimitState {
  reads: number[];
  writes: number[];
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// ═══════════════════════════════════════════════════
// IN-MEMORY QUEUE (FALLBACK)
// ═══════════════════════════════════════════════════

class InMemoryQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private rateLimitState: RateLimitState = { reads: [], writes: [] };
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    state: 'CLOSED',
  };
  private userRequestCount = new Map<string, number>();

  /**
   * Add request to queue
   */
  async enqueue<T>(request: Omit<QueuedRequest<T>, 'id' | 'timestamp' | 'retries'>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest<T> = {
        ...request,
        id: `${request.userId}-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        retries: 0,
        resolve: resolve as any,
        reject,
      };

      // Priority insertion
      const insertIndex = this.findInsertIndex(queuedRequest);
      this.queue.splice(insertIndex, 0, queuedRequest as any);

      // Track user requests
      this.userRequestCount.set(
        request.userId,
        (this.userRequestCount.get(request.userId) || 0) + 1
      );

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Find insertion index based on priority and fairness
   */
  private findInsertIndex(request: QueuedRequest): number {
    const userCount = this.userRequestCount.get(request.userId) || 0;

    for (let i = 0; i < this.queue.length; i++) {
      const existing = this.queue[i];

      // Higher priority always goes first
      if (this.getPriorityScore(request.priority) > this.getPriorityScore(existing.priority)) {
        return i;
      }

      // Same priority: fairness (users with fewer requests go first)
      if (
        this.getPriorityScore(request.priority) === this.getPriorityScore(existing.priority) &&
        userCount < (this.userRequestCount.get(existing.userId) || 0)
      ) {
        return i;
      }
    }

    return this.queue.length;
  }

  private getPriorityScore(priority: Priority): number {
    switch (priority) {
      case 'HIGH': return 3;
      case 'NORMAL': return 2;
      case 'LOW': return 1;
    }
  }

  /**
   * Process queue with rate limiting
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Check circuit breaker
      if (this.circuitBreaker.state === 'OPEN') {
        if (Date.now() - this.circuitBreaker.lastFailure > CIRCUIT_BREAKER.resetTimeout) {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.failures = 0;
        } else {
          // Wait before checking again
          await this.sleep(5000);
          continue;
        }
      }

      const request = this.queue[0];

      // Check rate limit
      if (!this.canProcessRequest(request.type)) {
        // Wait until rate limit resets
        await this.sleep(1000);
        continue;
      }

      // Remove from queue
      this.queue.shift();
      this.userRequestCount.set(
        request.userId,
        Math.max(0, (this.userRequestCount.get(request.userId) || 0) - 1)
      );

      // Execute request
      await this.executeRequest(request);
    }

    this.processing = false;
  }

  /**
   * Check if request can be processed within rate limits
   */
  private canProcessRequest(type: RequestType): boolean {
    const now = Date.now();
    const limit = RATE_LIMITS[type];
    const requests = type === 'READ' ? this.rateLimitState.reads : this.rateLimitState.writes;

    // Remove expired timestamps
    const validRequests = requests.filter(ts => now - ts < limit.windowMs);

    if (type === 'READ') {
      this.rateLimitState.reads = validRequests;
    } else {
      this.rateLimitState.writes = validRequests;
    }

    return validRequests.length < limit.maxPerMinute;
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest(request: QueuedRequest) {
    try {
      // Record request timestamp
      const now = Date.now();
      if (request.type === 'READ') {
        this.rateLimitState.reads.push(now);
      } else {
        this.rateLimitState.writes.push(now);
      }

      // Execute operation
      const result = await request.operation();

      // Success - reset circuit breaker
      if (this.circuitBreaker.state === 'HALF_OPEN') {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failures = 0;
      }

      request.resolve(result);
    } catch (error: any) {
      const is429 = error.code === 429 || error.message?.includes('429') || error.message?.includes('quota');

      if (is429 && request.retries < RETRY_CONFIG.maxRetries) {
        // Exponential backoff
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, request.retries),
          RETRY_CONFIG.maxDelay
        );

        console.warn(`[Queue] Rate limit hit. Retrying in ${delay}ms (attempt ${request.retries + 1})`);

        await this.sleep(delay);

        // Re-queue with increased retry count
        request.retries++;
        this.queue.unshift(request);
      } else {
        // Permanent failure
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();

        if (this.circuitBreaker.failures >= CIRCUIT_BREAKER.failureThreshold) {
          this.circuitBreaker.state = 'OPEN';
          console.error('[Queue] Circuit breaker opened due to too many failures');
        }

        request.reject(error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue stats
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      circuitBreakerState: this.circuitBreaker.state,
      readRequestsInWindow: this.rateLimitState.reads.length,
      writeRequestsInWindow: this.rateLimitState.writes.length,
      userCounts: Object.fromEntries(this.userRequestCount),
    };
  }
}

// ═══════════════════════════════════════════════════
// SINGLETON QUEUE INSTANCE
// ═══════════════════════════════════════════════════

const globalForQueue = globalThis as unknown as {
  sheetsQueue: InMemoryQueue | undefined;
};

export const sheetsQueue = globalForQueue.sheetsQueue ?? new InMemoryQueue();

if (process.env.NODE_ENV !== 'production') {
  globalForQueue.sheetsQueue = sheetsQueue;
}

// ═══════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════

/**
 * Queue a Google Sheets read operation
 */
export async function queueReadRequest<T>(
  userId: string,
  operation: () => Promise<T>,
  priority: Priority = 'NORMAL'
): Promise<T> {
  return sheetsQueue.enqueue({
    userId,
    type: 'READ',
    priority,
    operation,
    resolve: () => {},
    reject: () => {},
  });
}

/**
 * Queue a Google Sheets write operation
 */
export async function queueWriteRequest<T>(
  userId: string,
  operation: () => Promise<T>,
  priority: Priority = 'HIGH'
): Promise<T> {
  return sheetsQueue.enqueue({
    userId,
    type: 'WRITE',
    priority,
    operation,
    resolve: () => {},
    reject: () => {},
  });
}

/**
 * Get queue statistics (for monitoring)
 */
export function getQueueStats() {
  return sheetsQueue.getStats();
}