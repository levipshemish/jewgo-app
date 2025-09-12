/**
 * Frontend Authentication Middleware for V5 API
 * 
 * Provides comprehensive authentication and authorization middleware
 * for Next.js applications with role-based access control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { authClient } from './auth-v5';
import { metricsCollector } from './metrics-v5';

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  sub: string;
  user_id: number;
  email: string;
  name?: string;
  roles: string[];
  permissions?: string[];
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: {
    id: number;
    email: string;
    name?: string;
    roles: string[];
    permissions: string[];
  };
  token?: string;
  error?: string;
  status?: number;
}

/**
 * Authentication options
 */
export interface AuthOptions {
  /** Require user to be authenticated */
  required?: boolean;
  
  /** Require admin role */
  requireAdmin?: boolean;
  
  /** Required user roles */
  requiredRoles?: string[];
  
  /** Required permissions */
  requiredPermissions?: string[];
  
  /** Allow anonymous access */
  allowAnonymous?: boolean;
  
  /** Redirect URL for unauthenticated users */
  redirectUrl?: string;
  
  /** Custom validation function */
  customValidator?: (user: any) => boolean;
}

/**
 * Role hierarchy for access control
 */
const ROLE_HIERARCHY = {
  'super_admin': 1000,
  'system_admin': 800,
  'data_admin': 600,
  'moderator': 400,
  'premium_user': 200,
  'user': 100,
  'anonymous': 0,
} as const;

/**
 * Permission mapping for role-based access control
 */
const ROLE_PERMISSIONS = {
  'super_admin': [
    'read_all', 'write_all', 'delete_all', 'admin_all',
    'manage_users', 'manage_roles', 'manage_system',
    'view_audit_logs', 'export_data', 'import_data'
  ],
  'system_admin': [
    'read_all', 'write_all', 'manage_users', 'manage_system',
    'view_audit_logs', 'export_data'
  ],
  'data_admin': [
    'read_all', 'write_all', 'manage_content',
    'export_data', 'import_data'
  ],
  'moderator': [
    'read_all', 'write_own', 'moderate_content',
    'manage_reviews'
  ],
  'premium_user': [
    'read_all', 'write_own', 'create_reviews',
    'access_premium_features'
  ],
  'user': [
    'read_public', 'write_own', 'create_reviews'
  ],
  'anonymous': [
    'read_public'
  ]
} as const;

/**
 * Main authentication middleware function
 */
export async function validateAuth(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult> {
  const startTime = Date.now();
  
  try {
    // Extract token from request
    const token = extractToken(request);
    
    if (!token) {
      if (options.allowAnonymous && !options.required) {
        return {
          success: true,
          user: createAnonymousUser(),
        };
      }
      
      return {
        success: false,
        error: 'Authentication token not found',
        status: 401,
      };
    }

    // Validate and decode token
    const validationResult = await validateToken(token);
    if (!validationResult.success) {
      return validationResult;
    }

    const payload = validationResult.payload!;
    const user = createUserFromPayload(payload);

    // Check authorization
    const authzResult = checkAuthorization(user, options);
    if (!authzResult.success) {
      recordAuthMetrics('authorization_failed', Date.now() - startTime, user.id);
      return authzResult;
    }

    // Record successful authentication
    recordAuthMetrics('success', Date.now() - startTime, user.id);

    return {
      success: true,
      user,
      token,
    };

  } catch (error) {
    console.error('Authentication error:', error);
    recordAuthMetrics('error', Date.now() - startTime);
    
    return {
      success: false,
      error: 'Authentication failed',
      status: 500,
    };
  }
}

/**
 * Extract JWT token from request
 */
function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies (for Next.js API routes)
  const tokenCookie = request.cookies.get('access_token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

/**
 * Validate JWT token
 */
async function validateToken(token: string): Promise<{
  success: boolean;
  payload?: JWTPayload;
  error?: string;
  status?: number;
}> {
  try {
    // Decode token (this also validates format)
    const payload = jwtDecode<JWTPayload>(token);
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return {
        success: false,
        error: 'Token has expired',
        status: 401,
      };
    }

    // Check issuer (if configured)
    const expectedIssuer = process.env.JWT_ISSUER || 'jewgo-api';
    if (payload.iss && payload.iss !== expectedIssuer) {
      return {
        success: false,
        error: 'Invalid token issuer',
        status: 401,
      };
    }

    // Verify token signature by calling auth service
    const verificationResult = await authClient.verifyToken(token);
    if (!verificationResult.valid) {
      return {
        success: false,
        error: 'Invalid token signature',
        status: 401,
      };
    }

    return {
      success: true,
      payload,
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'InvalidTokenError') {
      return {
        success: false,
        error: 'Invalid token format',
        status: 401,
      };
    }
    
    return {
      success: false,
      error: 'Token validation failed',
      status: 500,
    };
  }
}

/**
 * Create user object from JWT payload
 */
function createUserFromPayload(payload: JWTPayload) {
  const roles = payload.roles || ['user'];
  const permissions = getPermissionsFromRoles(roles);
  
  return {
    id: payload.user_id,
    email: payload.email,
    name: payload.name,
    roles,
    permissions: [...permissions, ...(payload.permissions || [])],
  };
}

/**
 * Create anonymous user object
 */
function createAnonymousUser() {
  return {
    id: 0,
    email: 'anonymous@jewgo.app',
    name: 'Anonymous User',
    roles: ['anonymous'],
    permissions: getPermissionsFromRoles(['anonymous']),
  };
}

/**
 * Get permissions from user roles
 */
function getPermissionsFromRoles(roles: string[]): string[] {
  const permissions = new Set<string>();
  
  for (const role of roles) {
    const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    if (rolePermissions) {
      rolePermissions.forEach(permission => permissions.add(permission));
    }
  }
  
  return Array.from(permissions);
}

/**
 * Check user authorization against requirements
 */
function checkAuthorization(
  user: { roles: string[]; permissions: string[] },
  options: AuthOptions
): AuthResult {
  
  // Admin requirement check
  if (options.requireAdmin) {
    const hasAdminRole = user.roles.some(role => 
      ['super_admin', 'system_admin', 'data_admin'].includes(role)
    );
    
    if (!hasAdminRole) {
      return {
        success: false,
        error: 'Admin privileges required',
        status: 403,
      };
    }
  }

  // Required roles check
  if (options.requiredRoles && options.requiredRoles.length > 0) {
    const hasRequiredRole = options.requiredRoles.some(requiredRole =>
      user.roles.includes(requiredRole)
    );
    
    if (!hasRequiredRole) {
      return {
        success: false,
        error: `Required role: ${options.requiredRoles.join(' or ')}`,
        status: 403,
      };
    }
  }

  // Required permissions check
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const userHasAllPermissions = options.requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );
    
    if (!userHasAllPermissions) {
      const missingPermissions = options.requiredPermissions.filter(
        permission => !user.permissions.includes(permission)
      );
      
      return {
        success: false,
        error: `Missing permissions: ${missingPermissions.join(', ')}`,
        status: 403,
      };
    }
  }

  // Custom validator check
  if (options.customValidator && !options.customValidator(user)) {
    return {
      success: false,
      error: 'Custom authorization check failed',
      status: 403,
    };
  }

  return { success: true };
}

/**
 * Record authentication metrics
 */
function recordAuthMetrics(
  _outcome: 'success' | 'authorization_failed' | 'error',
  _duration: number,
  _userId?: number
): void {
  try {
    metricsCollector.recordUsage(
      'auth',
      'authentication'
    );
  } catch (error) {
    console.warn('Failed to record auth metrics:', error);
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(user: { roles: string[] }, role: string): boolean {
  return user.roles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: { roles: string[] }, roles: string[]): boolean {
  return roles.some(role => user.roles.includes(role));
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: { permissions: string[] }, permission: string): boolean {
  return user.permissions.includes(permission);
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(user: { permissions: string[] }, permissions: string[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission));
}

/**
 * Check if user has minimum role level
 */
export function hasMinimumRoleLevel(user: { roles: string[] }, minRole: string): boolean {
  const minLevel = ROLE_HIERARCHY[minRole as keyof typeof ROLE_HIERARCHY] || 0;
  const userMaxLevel = Math.max(
    ...user.roles.map(role => ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] || 0)
  );
  
  return userMaxLevel >= minLevel;
}

/**
 * Get user's highest role level
 */
export function getMaxRoleLevel(user: { roles: string[] }): number {
  return Math.max(
    ...user.roles.map(role => ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] || 0)
  );
}

/**
 * Create Next.js middleware for route protection
 */
export function createAuthMiddleware(options: AuthOptions = {}) {
  return async (request: NextRequest): Promise<NextResponse | void> => {
    const authResult = await validateAuth(request, options);
    
    if (!authResult.success) {
      if (options.redirectUrl) {
        const url = new URL(options.redirectUrl, request.url);
        url.searchParams.set('returnUrl', request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error || 'Authentication failed',
          code: 'AUTHENTICATION_FAILED'
        },
        { status: authResult.status || 401 }
      );
    }
    
    // Add user info to headers for downstream consumption
    const response = NextResponse.next();
    response.headers.set('X-User-ID', authResult.user!.id.toString());
    response.headers.set('X-User-Roles', authResult.user!.roles.join(','));
    
    return response;
  };
}

/**
 * Utility function for API route authentication
 */
export async function requireAuth(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{ user: any; token: string } | NextResponse> {
  const authResult = await validateAuth(request, { ...options, required: true });
  
  if (!authResult.success) {
    return NextResponse.json(
      { 
        success: false, 
        error: authResult.error || 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      },
      { status: authResult.status || 401 }
    );
  }
  
  return { 
    user: authResult.user!,
    token: authResult.token!
  };
}

/**
 * Main authentication middleware function (alias for validateAuth)
 */
export const authMiddleware = validateAuth;

/**
 * Utility function for admin-only routes
 */
export async function requireAdmin(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{ user: any; token: string } | NextResponse> {
  return requireAuth(request, { ...options, requireAdmin: true });
}

/**
 * Rate limiting for failed authentication attempts
 */
export class AuthRateLimit {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;
  
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) { // 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);
    
    if (!attempt || now > attempt.resetTime) {
      return true;
    }
    
    return attempt.count < this.maxAttempts;
  }
  
  recordAttempt(identifier: string, failed: boolean): void {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);
    
    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(identifier, {
        count: failed ? 1 : 0,
        resetTime: now + this.windowMs,
      });
    } else if (failed) {
      attempt.count++;
    }
  }
  
  getRemainingTime(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return 0;
    
    return Math.max(0, attempt.resetTime - Date.now());
  }
}

// Global rate limiter instance
export const authRateLimit = new AuthRateLimit();