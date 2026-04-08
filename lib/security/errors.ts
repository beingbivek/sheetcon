// lib/security/errors.ts

/**
 * Security-focused error handling
 * - Masks internal errors in production
 * - Provides user-friendly messages
 * - Logs full errors server-side
 */

// Error codes for client
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Authorization
  NOT_FOUND: 'NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  OWNERSHIP_REQUIRED: 'OWNERSHIP_REQUIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELDS: 'MISSING_FIELDS',
  
  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',
  CRUD_LIMIT_REACHED: 'CRUD_LIMIT_REACHED',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Google API
  GOOGLE_AUTH_ERROR: 'GOOGLE_AUTH_ERROR',
  SHEETS_ERROR: 'SHEETS_ERROR',
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  [ErrorCodes.UNAUTHORIZED]: 'Please sign in to continue.',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ErrorCodes.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCodes.ACCESS_DENIED]: 'Access denied.',
  [ErrorCodes.OWNERSHIP_REQUIRED]: 'You can only access your own resources.',
  [ErrorCodes.VALIDATION_ERROR]: 'Invalid data provided.',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input. Please check your data.',
  [ErrorCodes.MISSING_FIELDS]: 'Required fields are missing.',
  [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please slow down.',
  [ErrorCodes.CRUD_LIMIT_REACHED]: 'Daily operation limit reached. Upgrade your plan to continue.',
  [ErrorCodes.INTERNAL_ERROR]: 'Something went wrong. Please try again later.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable.',
  [ErrorCodes.GOOGLE_AUTH_ERROR]: 'Google authentication failed. Please sign out and sign in again.',
  [ErrorCodes.SHEETS_ERROR]: 'Failed to access Google Sheets. Please try again.',
};

// HTTP status codes for each error
const ERROR_STATUS_CODES: Record<string, number> = {
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.SESSION_EXPIRED]: 401,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.ACCESS_DENIED]: 403,
  [ErrorCodes.OWNERSHIP_REQUIRED]: 403,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_FIELDS]: 400,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.CRUD_LIMIT_REACHED]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.GOOGLE_AUTH_ERROR]: 401,
  [ErrorCodes.SHEETS_ERROR]: 502,
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(code: string, message?: string, details?: any) {
    super(message || ERROR_MESSAGES[code] || 'An error occurred');
    this.code = code;
    this.statusCode = ERROR_STATUS_CODES[code] || 500;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Log error securely (full details server-side only)
 */
export function logError(error: Error, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
  };
  
  // In production, you'd send this to a logging service
  // For now, console.error (only visible server-side)
  console.error('[SheetCon Error]', JSON.stringify(errorLog, null, 2));
}

/**
 * Mask error for client response
 * Hides internal details like database structure, stack traces
 */
export function maskError(error: unknown): { code: string; message: string; statusCode: number } {
  // If it's our custom ApiError, return it safely
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  // Handle known error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Google OAuth errors
    if (message.includes('invalid_grant') || message.includes('token')) {
      return {
        code: ErrorCodes.GOOGLE_AUTH_ERROR,
        message: ERROR_MESSAGES[ErrorCodes.GOOGLE_AUTH_ERROR],
        statusCode: 401,
      };
    }
    
    // Prisma errors (mask database details)
    if (message.includes('prisma') || message.includes('unique constraint') || message.includes('foreign key')) {
      logError(error, { type: 'DATABASE_ERROR' });
      return {
        code: ErrorCodes.INTERNAL_ERROR,
        message: ERROR_MESSAGES[ErrorCodes.INTERNAL_ERROR],
        statusCode: 500,
      };
    }
    
    // Google Sheets errors
    if (message.includes('sheets') || message.includes('spreadsheet')) {
      return {
        code: ErrorCodes.SHEETS_ERROR,
        message: ERROR_MESSAGES[ErrorCodes.SHEETS_ERROR],
        statusCode: 502,
      };
    }
  }
  
  // Default: mask everything
  logError(error instanceof Error ? error : new Error(String(error)));
  return {
    code: ErrorCodes.INTERNAL_ERROR,
    message: ERROR_MESSAGES[ErrorCodes.INTERNAL_ERROR],
    statusCode: 500,
  };
}

/**
 * Create error response for API routes
 */
export function errorResponse(error: unknown) {
  const { code, message, statusCode } = maskError(error);
  
  // Use NextResponse if available, otherwise return object
  const { NextResponse } = require('next/server');
  return NextResponse.json(
    { error: message, code },
    { status: statusCode }
  );
}

/**
 * Helper to throw common errors
 */
export const Errors = {
  unauthorized: () => new ApiError(ErrorCodes.UNAUTHORIZED),
  forbidden: () => new ApiError(ErrorCodes.FORBIDDEN),
  notFound: (resource?: string) => new ApiError(
    ErrorCodes.NOT_FOUND,
    resource ? `${resource} not found` : undefined
  ),
  accessDenied: () => new ApiError(ErrorCodes.ACCESS_DENIED),
  ownershipRequired: () => new ApiError(ErrorCodes.OWNERSHIP_REQUIRED),
  validation: (details?: any) => new ApiError(ErrorCodes.VALIDATION_ERROR, undefined, details),
  invalidInput: (message?: string) => new ApiError(ErrorCodes.INVALID_INPUT, message),
  missingFields: (fields?: string[]) => new ApiError(
    ErrorCodes.MISSING_FIELDS,
    fields ? `Missing required fields: ${fields.join(', ')}` : undefined
  ),
  rateLimited: () => new ApiError(ErrorCodes.RATE_LIMITED),
  crudLimit: () => new ApiError(ErrorCodes.CRUD_LIMIT_REACHED),
  internal: () => new ApiError(ErrorCodes.INTERNAL_ERROR),
  googleAuth: () => new ApiError(ErrorCodes.GOOGLE_AUTH_ERROR),
  sheets: () => new ApiError(ErrorCodes.SHEETS_ERROR),
};