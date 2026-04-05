// lib/env.ts

/**
 * Environment variable validation
 * Ensures all required env vars are present and correctly formatted
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string;
  
  // Auth
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  
  // Optional: Rate limiting
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

function validateEnv(): EnvConfig {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];
  
  const missing: string[] = [];
  
  for (const key of requiredVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file.'
    );
  }
  
  // Validate URL formats
  if (!process.env.DATABASE_URL?.startsWith('postgres')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  if (!process.env.NEXTAUTH_URL?.startsWith('http')) {
    throw new Error('NEXTAUTH_URL must be a valid URL');
  }
  
  // Security warnings
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_SECRET === 'development-secret') {
      throw new Error('NEXTAUTH_SECRET must be changed in production!');
    }
    
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      console.warn('[Security Warning] Rate limiting is disabled. Configure Upstash Redis for production.');
    }
  }
  
  // Ensure no NEXT_PUBLIC_ prefix on sensitive vars
  const sensitiveVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'GOOGLE_CLIENT_SECRET', 'UPSTASH_REDIS_REST_TOKEN'];
  for (const key of sensitiveVars) {
    if (process.env[`NEXT_PUBLIC_${key}`]) {
      throw new Error(
        `SECURITY ERROR: ${key} should NOT have NEXT_PUBLIC_ prefix! ` +
        'This would expose it to the client.'
      );
    }
  }
  
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

// Validate on module load
export const env = validateEnv();

// Type-safe env access
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  return env[key];
}

// Check if rate limiting is enabled
export function isRateLimitingEnabled(): boolean {
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}