// Type-safe error handling utilities
// This provides consistent error types and handling across the application

/**
 * Standard application error type
 * Handles both Error objects and plain error objects with message property
 */
export type AppError = Error | { message: string; code?: string; name?: string };

/**
 * Type guard to check if a value is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error || 
         (typeof error === 'object' && error !== null && 'message' in error);
}

/**
 * Extract error message from AppError
 */
export function getErrorMessage(error: AppError): string {
  return error instanceof Error ? error.message : error.message;
}

/**
 * Extract error code from AppError
 */
export function getErrorCode(error: AppError): string | undefined {
  return error instanceof Error ? undefined : error.code;
}

/**
 * Extract error name from AppError
 */
export function getErrorName(error: AppError): string | undefined {
  return error instanceof Error ? error.name : error.name;
}

/**
 * Create a standardized error object
 */
export function createAppError(message: string, code?: string, name?: string): AppError {
  return { message, code, name };
}

/**
 * Zod validation error type
 */
export interface ZodValidationError {
  name: 'ZodError';
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

/**
 * Check if error is a Zod validation error
 */
export function isZodError(error: unknown): error is ZodValidationError {
  return isAppError(error) && getErrorName(error) === 'ZodError';
}

/**
 * API error response type
 */
export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string>;
  code?: string;
  status?: number;
}

/**
 * Check if response is an API error
 */
export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return typeof response === 'object' && 
         response !== null && 
         'error' in response && 
         typeof (response as ApiErrorResponse).error === 'string';
}

/**
 * Network error type
 */
export interface NetworkError {
  type: 'network';
  message: string;
  status?: number;
  url?: string;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return typeof error === 'object' && 
         error !== null && 
         'type' in error && 
         (error as NetworkError).type === 'network';
}

/**
 * Create a network error
 */
export function createNetworkError(message: string, status?: number, url?: string): NetworkError {
  return { type: 'network', message, status, url };
}

/**
 * Error context for logging and debugging
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Enhanced error with context
 */
export type ContextualError = AppError & {
  context?: ErrorContext;
};

/**
 * Add context to an error
 */
export function addErrorContext(error: AppError, context: ErrorContext): ContextualError {
  return {
    ...error,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
    },
  };
}
