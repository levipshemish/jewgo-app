import { NextResponse } from 'next/server';

/**
 * Error middleware for Next.js API routes
 * 
 * This middleware provides standardized error handling and response formatting
 * for API routes.
 */

export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  timestamp?: string;
  correlationId?: string;
}

/**
 * Simple error handler that returns a standardized error response
 * 
 * @param error - The error object or message
 * @param status - HTTP status code (default: 500)
 * @param details - Additional error details
 * @returns NextResponse with error information
 */
export function simpleErrorHandler(
  error: any,
  status: number = 500,
  details?: any
): NextResponse {
  const errorMessage = extractErrorMessage(error);
  const timestamp = new Date().toISOString();
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: errorMessage,
    timestamp,
    ...(details && { details })
  };
  
  // Log error for debugging
  console.error('API Error:', {
    message: errorMessage,
    status,
    details,
    timestamp,
    stack: error instanceof Error ? error.stack : undefined
  });
  
  return NextResponse.json(errorResponse, { status });
}

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  if (error?.details) {
    return error.details;
  }
  
  return 'An unknown error occurred';
}

/**
 * Validation error handler
 * 
 * @param message - Validation error message
 * @param details - Validation details
 * @returns NextResponse with 400 status
 */
export function validationErrorHandler(
  message: string,
  details?: any
): NextResponse {
  return simpleErrorHandler(message, 400, details);
}

/**
 * Authentication error handler
 * 
 * @param message - Authentication error message
 * @returns NextResponse with 401 status
 */
export function authErrorHandler(message: string = 'Authentication required'): NextResponse {
  return simpleErrorHandler(message, 401);
}

/**
 * Authorization error handler
 * 
 * @param message - Authorization error message
 * @returns NextResponse with 403 status
 */
export function authorizationErrorHandler(message: string = 'Insufficient permissions'): NextResponse {
  return simpleErrorHandler(message, 403);
}

/**
 * Not found error handler
 * 
 * @param message - Not found error message
 * @returns NextResponse with 404 status
 */
export function notFoundErrorHandler(message: string = 'Resource not found'): NextResponse {
  return simpleErrorHandler(message, 404);
}

/**
 * Conflict error handler
 * 
 * @param message - Conflict error message
 * @returns NextResponse with 409 status
 */
export function conflictErrorHandler(message: string = 'Resource conflict'): NextResponse {
  return simpleErrorHandler(message, 409);
}

/**
 * Rate limit error handler
 * 
 * @param message - Rate limit error message
 * @returns NextResponse with 429 status
 */
export function rateLimitErrorHandler(message: string = 'Rate limit exceeded'): NextResponse {
  return simpleErrorHandler(message, 429);
}

/**
 * Internal server error handler
 * 
 * @param error - The error object
 * @param details - Additional error details
 * @returns NextResponse with 500 status
 */
export function internalServerErrorHandler(
  error: any,
  details?: any
): NextResponse {
  return simpleErrorHandler(error, 500, details);
}

/**
 * Service unavailable error handler
 * 
 * @param message - Service unavailable message
 * @returns NextResponse with 503 status
 */
export function serviceUnavailableErrorHandler(message: string = 'Service temporarily unavailable'): NextResponse {
  return simpleErrorHandler(message, 503);
}

/**
 * Handle database errors
 * 
 * @param error - Database error
 * @returns NextResponse with appropriate status
 */
export function databaseErrorHandler(error: any): NextResponse {
  const message = extractErrorMessage(error);
  
  // Check for specific database error types
  if (message.includes('duplicate') || message.includes('unique constraint')) {
    return conflictErrorHandler('Resource already exists');
  }
  
  if (message.includes('not found') || message.includes('does not exist')) {
    return notFoundErrorHandler('Resource not found');
  }
  
  if (message.includes('permission') || message.includes('access denied')) {
    return authorizationErrorHandler('Database access denied');
  }
  
  // Default to internal server error for database issues
  return internalServerErrorHandler(error, { type: 'database_error' });
}

/**
 * Handle external API errors
 * 
 * @param error - External API error
 * @param service - Service name
 * @returns NextResponse with appropriate status
 */
export function externalApiErrorHandler(error: any, service: string): NextResponse {
  const message = extractErrorMessage(error);
  
  // Check for specific HTTP status codes
  if (message.includes('401') || message.includes('unauthorized')) {
    return authErrorHandler(`Authentication failed with ${service}`);
  }
  
  if (message.includes('403') || message.includes('forbidden')) {
    return authorizationErrorHandler(`Access denied by ${service}`);
  }
  
  if (message.includes('404') || message.includes('not found')) {
    return notFoundErrorHandler(`Resource not found in ${service}`);
  }
  
  if (message.includes('429') || message.includes('rate limit')) {
    return rateLimitErrorHandler(`Rate limit exceeded for ${service}`);
  }
  
  if (message.includes('503') || message.includes('unavailable')) {
    return serviceUnavailableErrorHandler(`${service} is temporarily unavailable`);
  }
  
  // Default to service unavailable for external API issues
  return serviceUnavailableErrorHandler(`External service error: ${service}`);
}

/**
 * Handle validation errors from external libraries
 * 
 * @param error - Validation error
 * @returns NextResponse with validation details
 */
export function validationLibraryErrorHandler(error: any): NextResponse {
  const message = extractErrorMessage(error);
  
  // Try to extract validation details
  let details = null;
  if (error?.details) {
    details = error.details;
  } else if (error?.errors) {
    details = error.errors;
  } else if (error?.validation) {
    details = error.validation;
  }
  
  return validationErrorHandler(message, details);
}

/**
 * Create a custom error response
 * 
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Additional details
 * @returns NextResponse
 */
export function customErrorHandler(
  message: string,
  status: number,
  details?: any
): NextResponse {
  return simpleErrorHandler(message, status, details);
}

/**
 * Generic API error handler with flexible parameters
 */
export function handleApiError(
  error: any,
  statusOrMessage?: number | string,
  details?: any
): NextResponse {
  // If second parameter is a string, treat it as a message override
  if (typeof statusOrMessage === 'string') {
    return simpleErrorHandler(statusOrMessage, 500, { originalError: error });
  }
  
  // Otherwise treat it as a status code
  return simpleErrorHandler(error, statusOrMessage || 500, details);
}
