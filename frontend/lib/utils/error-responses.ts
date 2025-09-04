import { NextResponse } from 'next/server';

/**
 * Standardized error response utilities to eliminate duplication across API routes
 */

export interface ErrorResponseOptions {
  message?: string;
  details?: any;
  code?: string;
  headers?: Record<string, string>;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  status: number,
  error: string,
  options: ErrorResponseOptions = {}
): NextResponse {
  const { message, details, code, headers } = options;
  
  const responseBody: any = { error };
  if (message) responseBody.message = message;
  if (details) responseBody.details = details;
  if (code) responseBody.code = code;

  return NextResponse.json(responseBody, { status, headers });
}

/**
 * Common error responses
 */
export const errorResponses = {
  unauthorized: (message = 'Unauthorized') => 
    createErrorResponse(401, message),
  
  forbidden: (message = 'Forbidden', code?: string) => 
    createErrorResponse(403, message, { code }),
  
  notFound: (message = 'Not found') => 
    createErrorResponse(404, message),
  
  badRequest: (message = 'Bad request', details?: any) => 
    createErrorResponse(400, message, { details }),
  
  internalError: (message = 'Internal server error', details?: any) => 
    createErrorResponse(500, message, { details }),
  
  rateLimitExceeded: (message = 'Rate limit exceeded') => 
    createErrorResponse(429, message),
  
  insufficientPermissions: (permission?: string) => 
    createErrorResponse(403, permission ? `Insufficient permissions: ${permission}` : 'Insufficient permissions'),
  
  csrfViolation: () => 
    createErrorResponse(403, 'Forbidden', { code: 'CSRF' }),
  
  backendError: (status: number, message: string, details?: any) => 
    createErrorResponse(status, message, { details }),
};

/**
 * Success response helper
 */
export function createSuccessResponse(
  data: any,
  message?: string,
  status = 200
): NextResponse {
  const responseBody: any = { success: true, data };
  if (message) responseBody.message = message;
  
  return NextResponse.json(responseBody, { status });
}
