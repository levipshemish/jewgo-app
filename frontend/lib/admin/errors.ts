import { NextResponse } from 'next/server';

export interface AdminErrorOptions {
  status?: number;
  code?: string;
  message?: string;
  details?: string;
  correlationId?: string;
}

/**
 * Centralized error helper for admin API routes
 * Ensures consistent error structure and hides internal details in production
 */
export function adminError(
  status: number = 500,
  code: string = 'INTERNAL_ERROR',
  message?: string,
  details?: string,
  correlationId?: string
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse: any = {
    error: message || 'An error occurred',
    code,
  };

  // Only include details in development
  if (isDevelopment && details) {
    errorResponse.details = details;
  }

  // Include correlation ID for debugging
  if (correlationId) {
    errorResponse.correlationId = correlationId;
  }

  return NextResponse.json(errorResponse, { status });
}

/**
 * Common error responses
 */
export const AdminErrors = {
  // Authentication errors
  UNAUTHORIZED: (details?: string) => adminError(401, 'UNAUTHORIZED', 'Authentication required', details),
  INSUFFICIENT_PERMISSIONS: (details?: string) => adminError(403, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions', details),
  
  // CSRF errors
  CSRF_INVALID: (details?: string) => adminError(403, 'CSRF_INVALID', 'Invalid CSRF token', details),
  CSRF_MISSING: (details?: string) => adminError(403, 'CSRF_MISSING', 'CSRF token required', details),
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: (details?: string) => adminError(429, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', details),
  
  // Validation errors
  VALIDATION_ERROR: (details?: string) => adminError(400, 'VALIDATION_ERROR', 'Invalid request data', details),
  MISSING_REQUIRED_FIELD: (field: string) => adminError(400, 'MISSING_REQUIRED_FIELD', `Missing required field: ${field}`),
  INVALID_ID: (details?: string) => adminError(400, 'INVALID_ID', 'Invalid ID format', details),
  
  // Resource errors
  NOT_FOUND: (resource: string, details?: string) => adminError(404, 'NOT_FOUND', `${resource} not found`, details),
  ALREADY_EXISTS: (resource: string, details?: string) => adminError(409, 'ALREADY_EXISTS', `${resource} already exists`, details),
  
  // Database errors
  DATABASE_ERROR: (details?: string) => adminError(500, 'DATABASE_ERROR', 'Database operation failed', details),
  CONSTRAINT_VIOLATION: (details?: string) => adminError(400, 'CONSTRAINT_VIOLATION', 'Data constraint violation', details),
  
  // System errors
  INTERNAL_ERROR: (details?: string) => adminError(500, 'INTERNAL_ERROR', 'Internal server error', details),
  SERVICE_UNAVAILABLE: (details?: string) => adminError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable', details),
  
  // Export errors
  EXPORT_FAILED: (details?: string) => adminError(500, 'EXPORT_FAILED', 'Data export failed', details),
  EXPORT_TOO_LARGE: (details?: string) => adminError(413, 'EXPORT_TOO_LARGE', 'Export data too large', details),
  
  // Bulk operation errors
  BULK_OPERATION_FAILED: (details?: string) => adminError(500, 'BULK_OPERATION_FAILED', 'Bulk operation failed', details),
  PARTIAL_BULK_FAILURE: (details?: string) => adminError(207, 'PARTIAL_BULK_FAILURE', 'Some operations failed', details),
} as const;

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // CSRF
  CSRF_INVALID: 'CSRF_INVALID',
  CSRF_MISSING: 'CSRF_MISSING',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_ID: 'INVALID_ID',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Operations
  EXPORT_FAILED: 'EXPORT_FAILED',
  EXPORT_TOO_LARGE: 'EXPORT_TOO_LARGE',
  BULK_OPERATION_FAILED: 'BULK_OPERATION_FAILED',
  PARTIAL_BULK_FAILURE: 'PARTIAL_BULK_FAILURE',
} as const;

/**
 * Helper to create error responses with correlation IDs
 */
export function createErrorResponse(
  error: Error | string,
  status: number = 500,
  code: string = 'INTERNAL_ERROR',
  correlationId?: string
): NextResponse {
  const message = error instanceof Error ? error.message : error;
  const details = error instanceof Error ? error.stack : undefined;
  
  return adminError(status, code, message, details, correlationId);
}

/**
 * Helper to handle Prisma errors
 */
export function handlePrismaError(error: any, correlationId?: string): NextResponse {
  // Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference
  switch (error.code) {
    case 'P2002':
      return AdminErrors.ALREADY_EXISTS('Unique constraint violation', correlationId);
    case 'P2025':
      return AdminErrors.NOT_FOUND('Record', correlationId);
    case 'P2003':
      return AdminErrors.CONSTRAINT_VIOLATION('Foreign key constraint violation');
    case 'P2014':
      return AdminErrors.CONSTRAINT_VIOLATION('Required relation violation');
    case 'P2021':
      return AdminErrors.DATABASE_ERROR('Table does not exist');
    case 'P2022':
      return AdminErrors.DATABASE_ERROR('Column does not exist');
    default:
      return createErrorResponse(error, 500, 'DATABASE_ERROR', correlationId);
  }
}
