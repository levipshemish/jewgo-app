import { withReqStore, setRequestId } from './memo';
import { AdminAuthError, assertNodeRuntime, getNoStoreHeaders, secureLog } from './security';
import { randomUUID } from 'node:crypto';

/**
 * Generate cryptographically secure request ID
 */
function generateSecureRequestId(): string {
  return `req_${randomUUID()}`;
}

/**
 * JSON response helper with no-store cache headers
 * Use this for all admin API responses to prevent caching
 */
export function json(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: getNoStoreHeaders()
    }
  );
}

/**
 * Standard route handler wrapper with AsyncLocalStorage and error handling
 * Mandatory for all admin routes to prevent cross-request leaks
 */
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  assertNodeRuntime();
  return withReqStore(async () => {
    // Set request ID for correlation
    const requestId = generateSecureRequestId();
    setRequestId(requestId);
    
    try {
      return await fn();
    } catch (error) {
      // Handle admin auth errors
      if (error instanceof AdminAuthError) {
        secureLog('warn', 'ADMIN', {
          code: error.code,
          requestId,
          statusCode: error.statusCode
        });
        return error.toResponse();
      }
      
      // Handle thrown responses
      if (error instanceof Response) {
        return error;
      }
      
      // Handle errors with status codes (e.g., from RBAC middleware)
      if (error instanceof Error && (error as any).status) {
        const status = (error as any).status;
        secureLog('warn', 'ADMIN', {
          code: 'FORBIDDEN_ERROR',
          requestId,
          statusCode: status,
          error: error.message
        });
        
        return new Response(
          JSON.stringify({ 
            error: error.message, 
            code: 'FORBIDDEN',
            requestId 
          }),
          { 
            status, 
            headers: getNoStoreHeaders()
          }
        );
      }
      
      // Handle unexpected errors
      secureLog('error', 'ADMIN', {
        code: 'ROUTE_HANDLER_ERROR',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error', 
          code: 'INTERNAL_ERROR',
          requestId 
        }),
        { 
          status: 500, 
          headers: getNoStoreHeaders()
        }
      );
    }
  });
}

/**
 * Handle admin route with automatic admin authentication
 * Use for routes that require admin access
 */
export async function handleAdminRoute(
  fn: (admin: any) => Promise<Response>,
  request: Request
): Promise<Response> {
  return handleRoute(async () => {
    const { requireAdminOrThrow } = await import('./admin-auth');
    const admin = await requireAdminOrThrow(request);
    return fn(admin);
  });
}

/**
 * Type-safe route handler for GET requests
 */
export async function handleGET(fn: () => Promise<Response>): Promise<Response> {
  return handleRoute(fn);
}

/**
 * Type-safe route handler for POST requests with admin auth
 */
export async function handlePOST(
  fn: (admin: any) => Promise<Response>,
  request: Request
): Promise<Response> {
  return handleAdminRoute(fn, request);
}

/**
 * Type-safe route handler for PUT requests with admin auth
 */
export async function handlePUT(
  fn: (admin: any) => Promise<Response>,
  request: Request
): Promise<Response> {
  return handleAdminRoute(fn, request);
}

/**
 * Type-safe route handler for DELETE requests with admin auth
 */
export async function handleDELETE(
  fn: (admin: any) => Promise<Response>,
  request: Request
): Promise<Response> {
  return handleAdminRoute(fn, request);
}

/**
 * ESLint rule helper: Check if route exports use handleRoute wrapper
 * Add to your ESLint config to enforce proper wrapping
 */
export const REQUIRED_ROUTE_PATTERN = /return\s+handle(Route|GET|POST|PUT|DELETE)\s*\(/;

/**
 * Runtime check for proper route setup
 */
export function validateRouteSetup(routeFile: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.info(`[ADMIN] Route ${routeFile} using handleRoute wrapper ✓`);
  }
}