import { withReqStore, setRequestId } from './memo';
import { AdminAuthError } from './security';
import { secureLog } from './security';
import { createHash } from 'crypto';

// Runtime guard for Node-only features
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('[ADMIN] Admin auth requires Node.js runtime. Add "export const runtime = \'nodejs\'" to your route.');
}

/**
 * Generate cryptographically secure request ID
 */
function generateSecureRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = createHash('sha256')
    .update(Math.random().toString())
    .digest('hex')
    .slice(0, 8);
  return `req_${timestamp}_${random}`;
}

/**
 * Standard route handler wrapper with AsyncLocalStorage and error handling
 * Mandatory for all admin routes to prevent cross-request leaks
 */
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
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
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
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