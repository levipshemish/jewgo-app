/**
 * Frontend Error Middleware for V5 API
 * 
 * Comprehensive error handling middleware for Next.js applications
 * with structured error responses, logging, and monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from './metrics-v5';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  DATABASE = 'database',
  CACHE = 'cache',
  NETWORK = 'network'
}

/**
 * Structured error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    timestamp: string;
    requestId?: string;
    details?: Record<string, any>;
    stack?: string; // Only in development
    suggestions?: string[];
  };
  meta?: {
    endpoint: string;
    method: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

/**
 * Custom error classes for different scenarios
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly suggestions: string[];

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    details?: Record<string, any>,
    suggestions: string[] = []
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.details = details;
    this.suggestions = suggestions;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    code: string = 'AUTH_REQUIRED',
    details?: Record<string, any>
  ) {
    super(
      message,
      code,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      401,
      details,
      ['Please login to access this resource', 'Check if your session has expired']
    );
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    code: string = 'INSUFFICIENT_PERMISSIONS',
    details?: Record<string, any>
  ) {
    super(
      message,
      code,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      403,
      details,
      ['Contact an administrator for access', 'Verify your user role permissions']
    );
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    code: string = 'VALIDATION_FAILED',
    details?: Record<string, any>
  ) {
    super(
      message,
      code,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      400,
      details,
      ['Check the request format and required fields', 'Validate input data types']
    );
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    code: string = 'NOT_FOUND'
  ) {
    super(
      `${resource} not found`,
      code,
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.LOW,
      404,
      { resource },
      ['Verify the resource identifier', 'Check if the resource exists']
    );
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number
  ) {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      429,
      { retryAfter },
      [
        retryAfter ? `Please wait ${retryAfter} seconds before retrying` : 'Please wait before retrying',
        'Consider upgrading to a higher rate limit tier'
      ]
    );
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    code: string = 'DATABASE_ERROR',
    details?: Record<string, any>
  ) {
    super(
      message,
      code,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      503,
      details,
      ['Try again in a few moments', 'Contact support if the problem persists']
    );
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = 'External service unavailable',
    details?: Record<string, any>
  ) {
    super(
      `${service}: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      ErrorCategory.EXTERNAL,
      ErrorSeverity.HIGH,
      503,
      { service, ...details },
      [`${service} is temporarily unavailable`, 'Please try again later']
    );
  }
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /** Include stack trace in development */
  includeStack?: boolean;
  
  /** Log errors to console */
  logErrors?: boolean;
  
  /** Record error metrics */
  recordMetrics?: boolean;
  
  /** Sanitize sensitive data */
  sanitizeData?: boolean;
  
  /** Custom error processors */
  processors?: Array<(error: Error, request: NextRequest) => Promise<void>>;
  
  /** Error reporting service */
  reportingService?: {
    enabled: boolean;
    endpoint?: string;
    apiKey?: string;
  };
}

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  includeStack: process.env.NODE_ENV === 'development',
  logErrors: true,
  recordMetrics: true,
  sanitizeData: true,
  processors: [],
  reportingService: {
    enabled: false,
  },
};

/**
 * Main error handler middleware
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'cookie', 'session', 'csrf', 'ssn', 'credit_card'
  ];

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Handle errors and create structured response
   */
  async handleError(
    error: Error | AppError,
    request: NextRequest,
    context?: {
      requestId?: string;
      userId?: number;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<NextResponse> {
    const startTime = Date.now();
    
    try {
      // Determine error properties
      let statusCode = 500;
      let code = 'INTERNAL_ERROR';
      let category = ErrorCategory.INTERNAL;
      let severity = ErrorSeverity.HIGH;
      let details: Record<string, any> | undefined;
      let suggestions: string[] = [];

      if (error instanceof AppError) {
        statusCode = error.statusCode;
        code = error.code;
        category = error.category;
        severity = error.severity;
        details = error.details;
        suggestions = error.suggestions;
      } else {
        // Map known error types
        const mappedError = this.mapError(error);
        statusCode = mappedError.statusCode;
        code = mappedError.code;
        category = mappedError.category;
        severity = mappedError.severity;
      }

      // Sanitize sensitive data
      if (this.config.sanitizeData && details) {
        details = this.sanitizeDetails(details);
      }

      // Create error response
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          message: error.message,
          code,
          category,
          severity,
          timestamp: new Date().toISOString(),
          requestId: context?.requestId,
          details,
          suggestions,
        },
        meta: {
          endpoint: request.nextUrl.pathname,
          method: request.method,
          userAgent: context?.userAgent,
          ipAddress: context?.ipAddress,
        },
      };

      // Include stack trace in development
      if (this.config.includeStack && process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = error.stack;
      }

      // Log error
      if (this.config.logErrors) {
        this.logError(error, errorResponse, request);
      }

      // Record metrics
      if (this.config.recordMetrics) {
        this.recordErrorMetrics(error, statusCode, category, severity, Date.now() - startTime);
      }

      // Run custom processors
      await this.runProcessors(error, request);

      // Report to external service
      if (this.config.reportingService?.enabled && severity === ErrorSeverity.CRITICAL) {
        await this.reportError(error, errorResponse);
      }

      return NextResponse.json(errorResponse, { status: statusCode });

    } catch (handlerError) {
      // Fallback error response if handler itself fails
      console.error('Error handler failed:', handlerError);
      
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Internal server error',
            code: 'HANDLER_ERROR',
            category: ErrorCategory.INTERNAL,
            severity: ErrorSeverity.CRITICAL,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * Map generic errors to structured errors
   */
  private mapError(error: Error): {
    statusCode: number;
    code: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
  } {
    const message = error.message.toLowerCase();

    // Authentication/Authorization errors
    if (message.includes('unauthorized') || message.includes('auth')) {
      return {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
      };
    }

    if (message.includes('forbidden') || message.includes('permission')) {
      return {
        statusCode: 403,
        code: 'FORBIDDEN',
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
      };
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return {
        statusCode: 404,
        code: 'NOT_FOUND',
        category: ErrorCategory.NOT_FOUND,
        severity: ErrorSeverity.LOW,
      };
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many')) {
      return {
        statusCode: 429,
        code: 'RATE_LIMITED',
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
      };
    }

    // Database errors
    if (message.includes('database') || message.includes('connection')) {
      return {
        statusCode: 503,
        code: 'DATABASE_ERROR',
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout')) {
      return {
        statusCode: 503,
        code: 'NETWORK_ERROR',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
      };
    }

    // Default internal error
    return {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
    };
  }

  /**
   * Sanitize sensitive data from error details
   */
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(details)) {
      const keyLower = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some(field => keyLower.includes(field));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Log error with structured format
   */
  private logError(error: Error, errorResponse: ErrorResponse, request: NextRequest): void {
    const logLevel = this.getLogLevel(errorResponse.error.severity);
    
    const logData = {
      timestamp: errorResponse.error.timestamp,
      level: logLevel,
      message: error.message,
      code: errorResponse.error.code,
      category: errorResponse.error.category,
      severity: errorResponse.error.severity,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      requestId: errorResponse.error.requestId,
      stack: error.stack,
    };

    // Use appropriate console method based on severity
    switch (errorResponse.error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ HIGH ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️  MEDIUM ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️  LOW ERROR:', logData);
        break;
    }
  }

  /**
   * Get log level from error severity
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Record error metrics
   */
  private recordErrorMetrics(
    error: Error,
    statusCode: number,
    category: ErrorCategory,
    severity: ErrorSeverity,
    processingTime: number
  ): void {
    try {
      metricsCollector.recordError(
        error.constructor.name,
        error.message,
        error.stack,
        { statusCode: statusCode.toString() },
        { processingTime }
      );
    } catch (metricsError) {
      console.warn('Failed to record error metrics:', metricsError);
    }
  }

  /**
   * Run custom error processors
   */
  private async runProcessors(error: Error, request: NextRequest): Promise<void> {
    if (!this.config.processors?.length) return;

    await Promise.allSettled(
      this.config.processors.map(processor => processor(error, request))
    );
  }

  /**
   * Report error to external service
   */
  private async reportError(error: Error, errorResponse: ErrorResponse): Promise<void> {
    if (!this.config.reportingService?.enabled) return;

    try {
      // This would integrate with services like Sentry, Bugsnag, etc.
      // For now, just log that we would report
      console.log('Would report error to external service:', {
        error: errorResponse.error,
        stack: error.stack,
      });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler();

/**
 * Convenience function for handling API route errors
 */
export async function handleApiError(
  error: Error,
  request: NextRequest,
  context?: {
    requestId?: string;
    userId?: number;
  }
): Promise<NextResponse> {
  return errorHandler.handleError(error, request, context);
}

/**
 * Async wrapper for API route handlers with error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('API route error:', error);
      
      if (error instanceof Error) {
        return handleApiError(error, request, {
          requestId: request.headers.get('x-request-id') || undefined,
        });
      }
      
      return handleApiError(new Error('Unknown error occurred'), request);
    }
  };
}

/**
 * Main error middleware function (alias for handleApiError)
 */
export const errorMiddleware = handleApiError;

/**
 * Simple error handler for API routes that don't have access to NextRequest
 */
export function simpleErrorHandler(error: any): NextResponse {
  console.error('API route error:', error);
  
  const errorResponse = {
    success: false,
    error: {
      message: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      timestamp: new Date().toISOString(),
    }
  };
  
  return NextResponse.json(errorResponse, { status: 500 });
}

/**
 * Utility function to create validation errors
 */
export function createValidationError(
  field: string,
  value: any,
  expectedType: string
): ValidationError {
  return new ValidationError(
    `Invalid ${field}: expected ${expectedType}, got ${typeof value}`,
    'INVALID_FIELD',
    { field, value, expectedType }
  );
}