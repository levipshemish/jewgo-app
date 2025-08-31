import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { 
  transformSupabaseUser, 
  isSupabaseConfigured,
  type TransformedUser 
} from '@/lib/utils/auth-utils';
import type { AdminUser, AdminRole } from '@/lib/admin/types';
import type { Permission } from '@/lib/constants/permissions';

import { 
  ADMIN_PERMISSIONS, 
  ROLE_PERMISSIONS,
  getRoleLevelForRole 
} from './admin-constants';
import { 
  memoGetOrSet, 
  getRequestId 
} from './memo';
import { 
  enforceOrigin,
  requiresOriginCheck,
  AdminAuthError,
  throwAdminError,
  secureLog,
  validatePermissions,
  getNoStoreHeaders,
  normalizePermissions,
  assertNodeRuntime
} from './security';



// Production safety: Ensure dev overrides can't leak into production
function assertNoDevOverridesInProd(): void {
  if (process.env.NODE_ENV !== 'production') return;
  
  const devVars = ['ADMIN_DEFAULT_ROLE', 'ADMIN_BYPASS_PERMS', 'ADMIN_DEV_MOCK'];
  const setVars = devVars.filter(key => (process.env[key] || '').trim() !== '');
  
  if (setVars.length > 0) {
    const error = new Error(`[ADMIN] Dev overrides detected in production: ${setVars.join(', ')}`);
    secureLog('error', 'ADMIN', {
      code: 'DEV_OVERRIDES_IN_PROD',
      variables: setVars,
      requestId: getRequestId()
    });
    throw error;
  }
}

// Runtime assertion with enhanced logging
assertNoDevOverridesInProd();

// CI/CD environment check with metrics
if (process.env.NODE_ENV === 'production') {
  const ciDevVars = ['ADMIN_DEFAULT_ROLE', 'ADMIN_BYPASS_PERMS', 'ADMIN_DEV_MOCK']
    .filter(key => process.env[key]);
  
  if (ciDevVars.length > 0) {
    secureLog('error', 'ADMIN', {
      code: 'DEV_OVERRIDES_IN_PROD_IMAGE',
      variables: ciDevVars,
      severity: 'critical'
    });
  }
}

/**
 * Get session user with roles (memoized per request)
 * Uses AsyncLocalStorage for proper per-request isolation
 */
async function getSessionUserWithRolesOnce(): Promise<TransformedUser | null> {
  return memoGetOrSet('session_user_with_roles', async () => {
    return await getSessionUserWithRoles();
  });
}

/**
 * Get session user with guaranteed role information
 * Enhanced with better error handling and metrics
 */
async function getSessionUserWithRoles(): Promise<TransformedUser | null> {
  try {
    if (!isSupabaseConfigured()) {
      secureLog('warn', 'ADMIN', {
        code: 'SUPABASE_NOT_CONFIGURED',
        requestId: getRequestId()
      });
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        secureLog('warn', 'ADMIN', {
          code: 'NO_ACCESS_TOKEN',
          hasUser: true,
          requestId: getRequestId()
        });
        return null;
      }
      
      // Transform user with role information using JWT validation
      const transformedUser = await transformSupabaseUser(user, {
        includeRoles: true,
        userToken: session.access_token
      });
      
      if (transformedUser) {
        secureLog('info', 'ADMIN', {
          code: 'USER_TRANSFORMED_SUCCESS',
          hasRoles: !!transformedUser.adminRole,
          roleLevel: transformedUser.roleLevel || 0,
          requestId: getRequestId()
        });
      }
      
      return transformedUser;
    }
  } catch (error) {
    secureLog('error', 'ADMIN', {
      code: 'SESSION_USER_ERROR',
      requestId: getRequestId(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return null;
}

/**
 * Require admin authentication for API routes (returns null on failure)
 * Use requireAdminOrThrow for API routes to prevent silent bypasses
 */
export async function requireAdmin(request: Request): Promise<AdminUser | null> {
  assertNodeRuntime();
  try {
    // Development rate limiting (never in production)
    if (process.env.NODE_ENV === 'development') {
      // Simple rate limiting for dev only - no global state
      const clientIP = (request as any).ip || 'unknown';
      secureLog('info', 'ADMIN', {
        code: 'DEV_RATE_LIMIT_CHECK',
        clientIP: clientIP.slice(0, 10), // Truncate for privacy
        requestId: getRequestId()
      });
    }

    // Get user with role information using JWT system
    const user = await getSessionUserWithRolesOnce();
    
    // Development mock user (only in development)
    if (!user && process.env.NODE_ENV === 'development' && process.env.ADMIN_DEV_MOCK === 'true') {
      const mockUser: TransformedUser = {
        id: 'dev-admin-user',
        email: 'dev-admin@jewgo.com',
        name: 'Development Admin',
        username: 'dev-admin',
        provider: 'unknown',
        avatar_url: null,
        providerInfo: { name: 'Development', icon: '👤', color: '#6B7280', displayName: 'Development' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEmailVerified: true,
        isPhoneVerified: false,
        role: 'user', // Don't use 'admin' to avoid Supabase role confusion
        permissions: Object.values(ADMIN_PERMISSIONS),
        subscriptionTier: 'free',
        adminRole: 'super_admin',
        roleLevel: 4,
        isSuperAdmin: true
      };
      
      secureLog('warn', 'ADMIN', {
        code: 'DEV_MOCK_USER_USED',
        requestId: getRequestId()
      });
      
      assertAdmin(mockUser);
      return mockUser as AdminUser;
    }
    
    if (!user) {
      return null;
    }

    // Check if user has admin role from JWT validation
    if (!user.adminRole || (user.roleLevel || 0) === 0) {
      secureLog('info', 'ADMIN', {
        code: 'USER_NOT_ADMIN',
        hasRole: !!user.adminRole,
        roleLevel: user.roleLevel || 0,
        requestId: getRequestId()
      });
      return null;
    }

    // Development role override (only in development)
    let adminRole = user.adminRole as AdminRole;
    if (process.env.NODE_ENV === 'development') {
      const defaultRole = (process.env.ADMIN_DEFAULT_ROLE || '').trim();
      if (defaultRole && ['moderator','data_admin','system_admin','super_admin'].includes(defaultRole)) {
        adminRole = defaultRole as AdminRole;
        secureLog('warn', 'ADMIN', {
          code: 'DEV_ROLE_OVERRIDE',
          originalRole: user.adminRole,
          overrideRole: adminRole,
          requestId: getRequestId()
        });
      }
      
      if (process.env.ADMIN_BYPASS_PERMS === 'true') {
        const bypassUser: TransformedUser = {
          ...user,
          adminRole: 'super_admin',
          roleLevel: 4,
          isSuperAdmin: true,
          permissions: Object.values(ADMIN_PERMISSIONS)
        };
        
        secureLog('warn', 'ADMIN', {
          code: 'DEV_PERMS_BYPASS',
          requestId: getRequestId()
        });
        
        assertAdmin(bypassUser);
        return bypassUser as AdminUser;
      }
    }

    // Validate and prefer backend-supplied permissions
    const { permissions, hasUnknown, fallbackUsed } = validatePermissions(
      user.permissions,
      normalizePermissions(ROLE_PERMISSIONS[adminRole] || [])
    );
    
    if (fallbackUsed) {
      secureLog('warn', 'ADMIN', {
        code: 'PERMISSION_FALLBACK_USED',
        adminRole,
        requestId: getRequestId()
      });
    }
    
    if (hasUnknown) {
      secureLog('warn', 'ADMIN', {
        code: 'UNKNOWN_PERMISSIONS_FILTERED',
        adminRole,
        requestId: getRequestId()
      });
    }

    // Create admin user with type safety
    const adminUser: TransformedUser = {
      ...user,
      adminRole,
      roleLevel: user.roleLevel || getRoleLevelForRole(adminRole),
      isSuperAdmin: user.isSuperAdmin || adminRole === 'super_admin',
      permissions: permissions as any
    };

    assertAdmin(adminUser);
    
    secureLog('info', 'ADMIN', {
      code: 'ADMIN_AUTH_SUCCESS',
      adminRole,
      roleLevel: adminUser.roleLevel,
      permissionCount: permissions.length,
      requestId: getRequestId()
    });
    
    return adminUser as AdminUser;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      throw error;
    }
    
    secureLog('error', 'ADMIN', {
      code: 'REQUIRE_ADMIN_ERROR',
      requestId: getRequestId(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Require admin authentication with throwing behavior for API routes
 * Prevents silent bypasses by throwing instead of returning null
 */
export async function requireAdminOrThrow(request: Request): Promise<AdminUser> {
  assertNodeRuntime();
  // Enforce Origin on mutating requests
  if (requiresOriginCheck(request.method)) {
    enforceOrigin(request);
  }
  
  const user = await requireAdmin(request);
  if (!user) {
    throwAdminError(
      'ADMIN_ACCESS_REQUIRED',
      'Admin access required',
      403,
      { 
        method: request.method, 
        path: new URL(request.url).pathname,
        requestId: getRequestId()
      }
    );
  }
  return user;
}

/**
 * Type-safe admin user assertion without casting
 * Enhanced with better error messages
 */
function assertAdmin(user: TransformedUser): asserts user is AdminUser {
  if (!user.adminRole) {
    throwAdminError(
      'NO_ADMIN_ROLE',
      'User has no admin role',
      403,
      { 
        hasUser: true,
        roleLevel: user.roleLevel || 0,
        requestId: getRequestId()
      }
    );
  }
  
  if ((user.roleLevel || 0) === 0) {
    throwAdminError(
      'INVALID_ROLE_LEVEL',
      'User has invalid role level',
      403,
      { 
        adminRole: user.adminRole,
        roleLevel: user.roleLevel || 0,
        requestId: getRequestId()
      }
    );
  }
}

/**
 * Get user's admin role from session (no caller-provided userId)
 * Eliminates identity confusion and potential misuse
 */
export async function getAdminRoleFromSession(): Promise<AdminRole | null> {
  try {
    const user = await getSessionUserWithRolesOnce();
    return user?.adminRole as AdminRole || null;
  } catch (error) {
    secureLog('error', 'ADMIN', {
      code: 'GET_ADMIN_ROLE_ERROR',
      requestId: getRequestId(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Get admin user from session using JWT-based role system
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const user = await getSessionUserWithRolesOnce();
    
    if (!user) {
      return null;
    }

    // Check if user has admin role from JWT validation
    if (!user.adminRole || (user.roleLevel || 0) === 0) {
      return null;
    }

    // Validate and prefer backend-supplied permissions
    const { permissions } = validatePermissions(
      user.permissions,
      normalizePermissions(ROLE_PERMISSIONS[user.adminRole as AdminRole] || [])
    );
    
    const adminUser: AdminUser = {
      ...user,
      adminRole: user.adminRole as AdminRole,
      roleLevel: user.roleLevel || getRoleLevelForRole(user.adminRole as AdminRole),
      isSuperAdmin: user.isSuperAdmin || user.adminRole === 'super_admin',
      permissions: permissions as Permission[]
    };

    assertAdmin(adminUser);
    return adminUser;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      throw error;
    }
    
    secureLog('error', 'ADMIN', {
      code: 'GET_ADMIN_USER_ERROR',
      requestId: getRequestId(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Require admin user with throwing behavior
 */
export async function requireAdminUser(): Promise<AdminUser> {
  assertNodeRuntime();
  const adminUser = await getAdminUser();
  if (!adminUser) {
    throwAdminError('ADMIN_ACCESS_REQUIRED', 'Admin access required');
  }
  return adminUser;
}

/**
 * Get cache control headers for admin responses
 */
export function getAdminHeaders(): Record<string, string> {
  return getNoStoreHeaders();
}