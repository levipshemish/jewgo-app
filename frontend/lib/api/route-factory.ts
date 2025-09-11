/**
 * Generic Route Factory for V5 API
 * 
 * Provides a factory pattern for creating standardized Next.js API routes
 * with built-in authentication, validation, error handling, and monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuthFromRequest } from './utils-v5';
import { EntityType } from './types-v5';
import { apiClient } from './index-v5';
import { metricsCollector } from './metrics-v5';

/**
 * Configuration for route factory
 */
export interface RouteConfig {
  /** Authentication requirements */
  auth?: {
    required?: boolean;
    requireAdmin?: boolean;
    requiredRoles?: string[];
    allowAnonymous?: boolean;
  };
  
  /** Rate limiting configuration */
  rateLimit?: {
    enabled?: boolean;
    maxRequests?: number;
    windowMs?: number;
    skipSuccessfulRequests?: boolean;
  };
  
  /** Caching configuration */
  cache?: {
    enabled?: boolean;
    maxAge?: number;
    swr?: number;
    revalidateOnError?: boolean;
    tags?: string[];
  };
  
  /** Validation schemas */
  validation?: {
    body?: any; // JSON schema or Zod schema
    query?: any;
    params?: any;
  };
  
  /** Monitoring and observability */
  monitoring?: {
    enabled?: boolean;
    recordMetrics?: boolean;
    logRequests?: boolean;
    sensitiveFields?: string[];
  };
  
  /** CORS settings */
  cors?: {
    enabled?: boolean;
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };
}

/**
 * Route handler function type
 */
export type RouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse> | NextResponse;

/**
 * Enhanced route context with utilities
 */
export interface RouteContext {
  /** Request parameters */
  params?: { [key: string]: string };
  
  /** Authenticated user (if auth enabled) */
  user?: any;
  
  /** User roles (if auth enabled) */
  userRoles?: string[];
  
  /** Request metadata */
  requestId: string;
  userAgent?: string;
  ipAddress?: string;
  
  /** Utility functions */
  utils: {
    validateEntity: (entityType: string) => boolean;
    parseFilters: (searchParams: URLSearchParams) => Record<string, any>;
    parsePagination: (searchParams: URLSearchParams) => { cursor?: string; limit: number };
    formatResponse: <T>(data: T, metadata?: Record<string, any>) => NextResponse;
    formatError: (error: string, status?: number, details?: any) => NextResponse;
  };
}

/**
 * Default route configuration
 */
const DEFAULT_CONFIG: RouteConfig = {
  auth: {
    required: false,
    requireAdmin: false,
    allowAnonymous: true,
  },
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
  cache: {
    enabled: false,
  },
  monitoring: {
    enabled: true,
    recordMetrics: true,
    logRequests: false,
  },
  cors: {
    enabled: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
  },
};

/**
 * Create a standardized API route with middleware
 */
export function createRoute(
  handler: RouteHandler,
  config: RouteConfig = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  return async function routeWrapper(
    request: NextRequest,
    { params }: { params?: { [key: string]: string } } = {}
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    try {
      // CORS handling
      if (mergedConfig.cors?.enabled && request.method === 'OPTIONS') {
        return handleCORS(request, mergedConfig.cors);
      }

      // Create enhanced context
      const context = await createRouteContext(request, params, requestId, mergedConfig);

      // Pre-request middleware
      const middlewareResponse = await runPreRequestMiddleware(request, context, mergedConfig);
      if (middlewareResponse) {
        return middlewareResponse;
      }

      // Execute the handler
      const response = await handler(request, context);

      // Post-request middleware
      await runPostRequestMiddleware(request, response, context, mergedConfig, startTime);

      // Add CORS headers if enabled
      if (mergedConfig.cors?.enabled) {
        addCORSHeaders(response, mergedConfig.cors);
      }

      return response;

    } catch (error) {
      // Error handling
      const errorResponse = await handleRouteError(error, request, requestId, mergedConfig);
      
      // Record error metrics
      if (mergedConfig.monitoring?.recordMetrics) {
        metricsCollector.recordError(
          'route_error',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : undefined,
          {
            endpoint: request.nextUrl.pathname,
            method: request.method,
          }
        );
      }

      return errorResponse;
    }
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create enhanced route context
 */
async function createRouteContext(
  request: NextRequest,
  params: { [key: string]: string } | undefined,
  requestId: string,
  config: RouteConfig
): Promise<RouteContext> {
  const userAgent = request.headers.get('user-agent') || undefined;
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                    request.headers.get('x-real-ip') || 
                    // request.ip || // Not available in NextRequest 
                    'unknown';

  let user: any = undefined;
  let userRoles: string[] = [];

  // Authentication if required
  if (config.auth?.required || config.auth?.requireAdmin) {
    const authResult = await validateAuthFromRequest(request, {
      requireAdmin: config.auth.requireAdmin,
      // requiredRoles: config.auth.requiredRoles, // Not available in current config
    });

    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication failed');
    }

    user = authResult.user;
    userRoles = authResult.user?.roles || [];
  }

  return {
    params,
    user,
    userRoles,
    requestId,
    userAgent,
    ipAddress,
    utils: {
      validateEntity: (entityType: string): boolean => {
        const validTypes: EntityType[] = ['restaurants', 'synagogues', 'mikvahs', 'stores'];
        return validTypes.includes(entityType as EntityType);
      },

      parseFilters: (searchParams: URLSearchParams): Record<string, any> => {
        const filters: Record<string, any> = {};
        
        // Common filters
        const search = searchParams.get('search');
        if (search) filters.search = search;
        
        const status = searchParams.get('status');
        if (status) filters.status = status;
        
        const category = searchParams.get('category');
        if (category) filters.category = category;
        
        const kosherType = searchParams.get('kosher_type');
        if (kosherType) filters.kosher_type = kosherType;
        
        // Location filters
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const radius = searchParams.get('radius');
        if (lat && lng) {
          filters.location = {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            radius: radius ? parseFloat(radius) : 10,
          };
        }
        
        // Rating filter
        const minRating = searchParams.get('min_rating');
        if (minRating) filters.min_rating = parseFloat(minRating);
        
        return filters;
      },

      parsePagination: (searchParams: URLSearchParams) => {
        const cursor = searchParams.get('cursor') || undefined;
        const limit = Math.min(
          parseInt(searchParams.get('limit') || '20'),
          100
        );
        
        return { cursor, limit };
      },

      formatResponse: <T>(data: T, metadata?: Record<string, any>): NextResponse => {
        const response = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          ...metadata,
        };
        
        return NextResponse.json(response);
      },

      formatError: (error: string, status = 400, details?: any): NextResponse => {
        const response = {
          success: false,
          error,
          timestamp: new Date().toISOString(),
          ...(details && { details }),
        };
        
        return NextResponse.json(response, { status });
      },
    },
  };
}

/**
 * Run pre-request middleware
 */
async function runPreRequestMiddleware(
  request: NextRequest,
  context: RouteContext,
  config: RouteConfig
): Promise<NextResponse | null> {
  
  // Rate limiting
  if (config.rateLimit?.enabled) {
    const rateLimitResult = await checkRateLimit(request, context, config.rateLimit);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded', 
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }
  }

  // Request validation
  if (config.validation) {
    const validationResult = await validateRequest(request, context, config.validation);
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validationResult.errors 
        },
        { status: 400 }
      );
    }
  }

  return null;
}

/**
 * Run post-request middleware
 */
async function runPostRequestMiddleware(
  request: NextRequest,
  response: NextResponse,
  context: RouteContext,
  config: RouteConfig,
  startTime: number
): Promise<void> {
  const duration = Date.now() - startTime;
  
  // Record metrics
  if (config.monitoring?.recordMetrics) {
    metricsCollector.recordUsage(
      request.nextUrl.pathname,
      'api_call',
      true,
      {
        statusCode: response.status.toString(),
        userId: context.user?.id?.toString(),
      }
    );
  }
  
  // Add response headers
  response.headers.set('X-Request-ID', context.requestId);
  response.headers.set('X-Response-Time', `${duration}ms`);
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(request: NextRequest, corsConfig: NonNullable<RouteConfig['cors']>): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  addCORSHeaders(response, corsConfig);
  return response;
}

/**
 * Add CORS headers to response
 */
function addCORSHeaders(response: NextResponse, corsConfig: NonNullable<RouteConfig['cors']>): void {
  if (corsConfig.origins) {
    response.headers.set('Access-Control-Allow-Origin', corsConfig.origins.join(', '));
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  if (corsConfig.methods) {
    response.headers.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
  }
  
  if (corsConfig.headers) {
    response.headers.set('Access-Control-Allow-Headers', corsConfig.headers.join(', '));
  }
  
  if (corsConfig.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

/**
 * Check rate limiting
 */
async function checkRateLimit(
  _request: NextRequest,
  _context: RouteContext,
  _rateLimitConfig: NonNullable<RouteConfig['rateLimit']>
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // This would integrate with Redis or in-memory store
  // For now, return allowed
  return { allowed: true };
}

/**
 * Validate request data
 */
async function validateRequest(
  request: NextRequest,
  context: RouteContext,
  validationConfig: NonNullable<RouteConfig['validation']>
): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];
  
  // Basic validation - in production would use Zod or similar
  if (validationConfig.body && request.method !== 'GET') {
    try {
      const _body = await request.json();
      // Validation logic would go here
    } catch (_e) {
      errors.push('Invalid JSON body');
    }
  }
  
  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Handle route errors
 */
async function handleRouteError(
  error: unknown,
  _request: NextRequest,
  requestId: string,
  _config: RouteConfig
): Promise<NextResponse> {
  let statusCode = 500;
  let message = 'Internal server error';
  
  if (error instanceof AuthenticationError) {
    statusCode = 401;
    message = error.message;
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    message = error.message;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    message = error.message;
  }
  
  // Log error
  console.error(`Route error [${requestId}]:`, error);
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Custom error classes
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Helper function to create entity CRUD routes
 */
export function createEntityRoute(entityType: EntityType, config: RouteConfig = {}) {
  const entityConfig = {
    ...config,
    monitoring: {
      ...config.monitoring,
      recordMetrics: true,
    },
  };

  return {
    GET: createRoute(async (request, context) => {
      const { cursor, limit } = context.utils.parsePagination(request.nextUrl.searchParams);
      const filters = context.utils.parseFilters(request.nextUrl.searchParams);
      
      const response = await apiClient.getEntities(entityType, filters, { cursor, limit });
      
      if (!response || !response.data) {
        return context.utils.formatError('Failed to fetch entities', 500);
      }
      
      return context.utils.formatResponse(response.data, {
        entityType,
        filters,
        pagination: { cursor, limit },
      });
    }, entityConfig),

    POST: createRoute(async (request, context) => {
      const body = await request.json();
      
      const response = await apiClient.createEntity(entityType, body);
      
      if (!response.success) {
        return context.utils.formatError('Failed to create entity', 400);
      }
      
      return context.utils.formatResponse(response.data, { entityType });
    }, {
      ...entityConfig,
      auth: { required: true },
    }),
  };
}

/**
 * Helper function to create search routes
 */
export function createSearchRoute(config: RouteConfig = {}) {
  return createRoute(async (request, context) => {
    const { cursor, limit } = context.utils.parsePagination(request.nextUrl.searchParams);
    const filters = context.utils.parseFilters(request.nextUrl.searchParams);
    const query = request.nextUrl.searchParams.get('q') || '';
    
    if (!query.trim()) {
      return context.utils.formatError('Search query is required', 400);
    }
    
    const response = await apiClient.search(query, undefined, {
      filters,
      pagination: { cursor, limit },
    });
    
    if (!response.success) {
      return context.utils.formatError('Search failed', 500);
    }
    
    return context.utils.formatResponse(response.data, {
      query,
      filters,
      pagination: { cursor, limit },
    });
  }, {
    ...config,
    cache: {
      enabled: true,
      maxAge: 300, // 5 minutes
      swr: 600,    // 10 minutes stale-while-revalidate
    },
  });
}

// Export the createRouteHandler function for backward compatibility
export const createRouteHandler = createRoute;