import { NextRequest } from 'next/server';
import { validateAuthFromRequest as utilsValidateAuth } from '@/lib/api/utils-v5';

/**
 * Authentication middleware for Next.js API routes
 * 
 * This middleware validates JWT tokens and extracts user information
 * from the Authorization header.
 */

export interface AuthResult {
  success: boolean;
  error?: string;
  status?: number;
  token?: string;
  user?: {
    id: string;
    roles: string[];
    email?: string;
    permissions?: string[];
  };
}

/**
 * Authentication middleware function
 * 
 * @param request - Next.js request object
 * @param options - Optional configuration
 * @returns Promise<AuthResult> - Authentication result with user info
 */
export async function authMiddleware(
  request: NextRequest,
  options: { requireAdmin?: boolean } = {}
): Promise<AuthResult> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided',
        status: 401
      };
    }
    
    // Validate token structure and expiry
    if (!validateAuthToken(token)) {
      return {
        success: false,
        error: 'Invalid or expired token',
        status: 401
      };
    }
    
    // Decode token to get user information
    const userInfo = decodeToken(token);
    if (!userInfo) {
      return {
        success: false,
        error: 'Invalid token payload',
        status: 401
      };
    }
    
    // Check admin requirement if specified
    if (options.requireAdmin && !userInfo.roles?.includes('admin')) {
      return {
        success: false,
        error: 'Admin access required',
        status: 403
      };
    }
    
    return {
      success: true,
      token,
      user: {
        id: userInfo.id || userInfo.sub || 'unknown',
        roles: userInfo.roles || ['user'],
        email: userInfo.email,
        permissions: userInfo.permissions || []
      }
    };
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      success: false,
      error: 'Authentication validation failed',
      status: 500
    };
  }
}

/**
 * Validate JWT token structure and expiry
 */
function validateAuthToken(token: string): boolean {
  if (!token) return false;
  
  try {
    // Basic JWT validation (check structure)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode payload to check expiry
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    if (payload.exp && payload.exp < now) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Decode JWT token payload
 */
function decodeToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract user ID from token
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeToken(token);
  return payload?.id || payload?.sub || null;
}

/**
 * Check if user has specific role
 */
export function hasRole(user: any, role: string): boolean {
  return user?.roles?.includes(role) || false;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: any, roles: string[]): boolean {
  return user?.roles?.some((role: string) => roles.includes(role)) || false;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: any, permission: string): boolean {
  return user?.permissions?.includes(permission) || false;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: any, permissions: string[]): boolean {
  return user?.permissions?.some((permission: string) => permissions.includes(permission)) || false;
}

/**
 * Re-export validateAuthFromRequest for backward compatibility
 */
export const validateAuthFromRequest = utilsValidateAuth;
