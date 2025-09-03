import { createHash } from 'crypto';
import { getRequestId } from './memo';

/**
 * Assert Node.js runtime for admin operations
 */
export function assertNodeRuntime(): void {
  if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
    throw new Error('[ADMIN] Admin operations require Node.js runtime. Add "export const runtime = \'nodejs\'" to your route.');
  }
}

/**
 * Build allowed origins from environment variables with proper URL parsing
 */
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  
  // Add base URLs from environment
  const baseUrls = [
    process.env.APP_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL
  ].filter(Boolean);
  
  baseUrls.forEach(url => {
    try {
      const parsed = new URL(url!);
      // Add both http and https variants for localhost
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        origins.add(`http://${parsed.host}`);
        origins.add(`https://${parsed.host}`);
      } else {
        origins.add(`${parsed.protocol}//${parsed.host}`);
      }
    } catch (_error) {
      console.warn(`[ADMIN] Invalid URL in environment: ${url}`);
    }
  });
  
  // Add common localhost variants
  const localhostVariants = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://127.0.0.1:3000'
  ];
  
  localhostVariants.forEach(origin => origins.add(origin));
  
  // Log resolved origins in development
  if (process.env.NODE_ENV === 'development') {
    console.info('[ADMIN] Allowed origins:', Array.from(origins));
  }
  
  return origins;
}

// Allowed origins for admin operations
const ALLOWED_ORIGINS = buildAllowedOrigins();

/**
 * Admin authentication error class
 */
export class AdminAuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, any>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 403,
    details: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'AdminAuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        error: this.message,
        code: this.code,
        requestId: getRequestId()
      }),
      {
        status: this.statusCode,
        headers: getNoStoreHeaders()
      }
    );
  }
}

/**
 * Throw admin auth error with proper typing
 */
export function throwAdminError(
  code: string,
  message: string,
  statusCode: number = 403,
  details: Record<string, any> = {}
): never {
  throw new AdminAuthError(code, message, statusCode, details);
}

/**
 * Smart Origin enforcement with browser detection
 * Browser requests: require valid Origin header
 * Non-browser requests: require X-CSRF-Token header
 */
export function enforceOrigin(request: Request): void {
  const method = request.method.toUpperCase();
  
  // Skip OPTIONS requests
  if (method === 'OPTIONS') {
    return;
  }
  
  // Only enforce on mutating requests
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }
  
  const secFetchSite = request.headers.get('sec-fetch-site');
  const secFetchMode = request.headers.get('sec-fetch-mode');
  const origin = request.headers.get('origin');
  const userAgent = request.headers.get('user-agent') || '';
  
  // Detect browser context
  const isBrowserRequest = (
    secFetchSite !== null || 
    secFetchMode !== null || 
    userAgent.includes('Mozilla/')
  );
  
  if (isBrowserRequest) {
    // Browser requests: require valid Origin
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      secureLog('warn', 'ADMIN', {
        code: 'INVALID_ORIGIN_BROWSER',
        method,
        origin: origin || 'missing',
        userAgent: userAgent.slice(0, 100), // Truncate for logging
        requestId: getRequestId()
      });
      
      throw new AdminAuthError(
        'INVALID_ORIGIN',
        'Invalid origin for browser request',
        403,
        { origin, method }
      );
    }
  } else {
    // Non-browser requests: require CSRF token or Authorization header
    const csrfToken = request.headers.get('x-csrf-token');
    const hasAuth = !!request.headers.get('authorization');
    
    if (!hasAuth && !csrfToken) {
      secureLog('warn', 'ADMIN', {
        code: 'MISSING_CSRF_TOKEN',
        method,
        hasOrigin: !!origin,
        hasAuth,
        userAgent: userAgent.slice(0, 100),
        requestId: getRequestId()
      });
      
      throw new AdminAuthError(
        'MISSING_CSRF',
        'X-CSRF-Token header or Authorization header required for non-browser requests',
        403,
        { method }
      );
    }
    
    // Validate CSRF token format (simple validation)
    if (csrfToken && !isValidCSRFToken(csrfToken)) {
      secureLog('warn', 'ADMIN', {
        code: 'INVALID_CSRF_TOKEN',
        method,
        requestId: getRequestId()
      });
      
      throw new AdminAuthError(
        'INVALID_CSRF',
        'Invalid X-CSRF-Token format',
        403,
        { method }
      );
    }
  }
}

/**
 * Validate CSRF token format
 */
function isValidCSRFToken(token: string): boolean {
  // Simple format validation: base64url-like string, 16+ chars
  return /^[A-Za-z0-9_-]{16,}$/.test(token);
}

/**
 * Check if request method requires Origin enforcement
 */
export function requiresOriginCheck(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

/**
 * Get allowed origins for CORS configuration
 */
export function getAllowedOrigins(): string[] {
  return Array.from(ALLOWED_ORIGINS);
}

/**
 * Hash user ID for secure logging with salt
 */
export function hashUserId(userId: string): string {
  const salt = process.env.LOG_HASH_SALT || 'default-salt-change-in-prod';
  return createHash('sha256')
    .update(userId + salt)
    .digest('hex')
    .slice(0, 8);
}

/**
 * Sanitize log data to remove PII with enhanced protection
 */
export function sanitizeLogData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  
  // Hash user IDs
  if (sanitized.userId) {
    sanitized.uid_hash = hashUserId(sanitized.userId);
    delete sanitized.userId;
  }
  
  // Remove sensitive fields
  const sensitiveFields = [
    'email', 'phone', 'password', 'token', 'refresh_token', 
    'access_token', 'jwt', 'session', 'cookie', 'authorization',
    'x-api-key', 'x-auth-token'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });
  
  // Truncate long strings that might contain sensitive data (global size limit)
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
      sanitized[key] = sanitized[key].slice(0, 200) + '...[truncated]';
    }
  });
  
  return sanitized;
}

/**
 * Secure logger with enhanced PII protection and metrics
 */
export function secureLog(
  level: 'info' | 'warn' | 'error',
  component: string,
  data: Record<string, any>
): void {
  const sanitized = sanitizeLogData(data);
  const logEntry = {
    component,
    timestamp: new Date().toISOString(),
    requestId: getRequestId(),
    ...sanitized
  };
  
  console[level](`[${component.toUpperCase()}]`, logEntry);
  
  // Emit metrics for monitoring
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    emitMetric(component, data.code || 'unknown', level);
  }
}

/**
 * Emit metrics for production monitoring
 */
function emitMetric(component: string, code: string, level: string): void {
  // Implement your metrics system here (e.g., DataDog, CloudWatch)
  // This is a placeholder for the actual implementation
  if (process.env.METRICS_ENABLED === 'true') {
    console.info(`[METRICS] ${component}.${code}.${level}`);
  }
}

/**
 * Validate and filter permissions from backend with enhanced validation
 */
export function validatePermissions(
  backendPermissions: unknown,
  fallbackPermissions: string[]
): { permissions: string[]; hasUnknown: boolean; fallbackUsed: boolean } {
  if (!Array.isArray(backendPermissions)) {
    secureLog('warn', 'ADMIN', {
      code: 'AUTHZ_PERMS_BACKEND_INVALID',
      type: typeof backendPermissions,
      requestId: getRequestId()
    });
    
    // Emit fallback metric
    emitPermissionFallbackMetric('invalid_type');
    
    return { 
      permissions: normalizePermissions(fallbackPermissions), 
      hasUnknown: false, 
      fallbackUsed: true 
    };
  }
  
  // Treat empty array as authoritative (no permissions)
  if (backendPermissions.length === 0) {
    return { 
      permissions: [], 
      hasUnknown: false, 
      fallbackUsed: false 
    };
  }
  
  const validPermissions: string[] = [];
  const unknownPermissions: string[] = [];
  
  backendPermissions.forEach(perm => {
    if (typeof perm === 'string') {
      const normalized = normalizePermission(perm);
      if (isValidPermissionFormat(normalized)) {
        validPermissions.push(normalized);
      } else {
        unknownPermissions.push(perm);
      }
    }
  });
  
  if (unknownPermissions.length > 0) {
    secureLog('warn', 'ADMIN', {
      code: 'AUTHZ_PERMS_UNKNOWN',
      count: unknownPermissions.length,
      sample: unknownPermissions.slice(0, 3),
      requestId: getRequestId()
    });
  }
  
  // Only fallback if we have no valid permissions and some invalid ones
  if (validPermissions.length === 0 && unknownPermissions.length > 0) {
    secureLog('warn', 'ADMIN', {
      code: 'AUTHZ_PERMS_BACKEND_MISSING',
      requestId: getRequestId()
    });
    
    // Emit fallback metric
    emitPermissionFallbackMetric('empty_result');
    
    return { 
      permissions: normalizePermissions(fallbackPermissions), 
      hasUnknown: unknownPermissions.length > 0, 
      fallbackUsed: true 
    };
  }
  
  return { 
    permissions: validPermissions, 
    hasUnknown: unknownPermissions.length > 0, 
    fallbackUsed: false 
  };
}

/**
 * Normalize permission to lowercase and validate format
 */
export function normalizePermission(permission: string): string {
  return permission.toLowerCase().trim();
}

/**
 * Normalize array of permissions
 */
export function normalizePermissions(permissions: string[]): string[] {
  return permissions.map(normalizePermission);
}

/**
 * Check if permission follows expected format (enhanced regex)
 */
function isValidPermissionFormat(permission: string): boolean {
  // Enhanced format: allows digits, hyphens, underscores
  // Must contain exactly one colon
  return permission.includes(':') && /^[a-z0-9_-]+:[a-z0-9_-]+$/.test(permission);
}

/**
 * Emit permission fallback metric for monitoring
 */
function emitPermissionFallbackMetric(reason: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    secureLog('warn', 'METRICS', {
      code: 'PERMISSION_FALLBACK_USED',
      reason,
      requestId: getRequestId()
    });
  }
}

/**
 * Get no-store cache headers for admin responses
 */
export function getNoStoreHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

/**
 * CSRF validation for admin API routes
 * Enforces Origin/Referer validation and rejects cross-site requests
 */
export function validateCSRFHeaders(request: Request): { valid: boolean; reason?: string } {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const secFetchSite = request.headers.get('sec-fetch-site');
  
  // Get allowed origins from environment
  const allowedOrigins = process.env.ADMIN_ALLOWED_ORIGINS?.split(',') || [];
  if (process.env.NEXT_PUBLIC_APP_URL) {
    allowedOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.NEXT_PUBLIC_VERCEL_URL}`);
  }
  
  // Always allow same-origin requests
  const requestOrigin = new URL(request.url).origin;
  allowedOrigins.push(requestOrigin);
  
  // Check Origin header first (preferred)
  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      return { 
        valid: false, 
        reason: `Origin '${origin}' not in allowlist: ${allowedOrigins.join(', ')}` 
      };
    }
    return { valid: true };
  }
  
  // If Origin is missing, check Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.includes(refererUrl.origin)) {
        return { valid: true };
      }
      return { 
        valid: false, 
        reason: `Referer origin '${refererUrl.origin}' not in allowlist` 
      };
    } catch {
      return { valid: false, reason: 'Invalid Referer header format' };
    }
  }
  
  // Reject cross-site requests without proper headers
  if (secFetchSite === 'cross-site') {
    return { 
      valid: false, 
      reason: 'Cross-site request without Origin/Referer headers' 
    };
  }
  
  // Allow same-origin requests without Origin/Referer
  return { valid: true };
}