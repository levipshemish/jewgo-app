import { NextRequest } from 'next/server';
import { json } from '@/lib/server/route-helpers';
import { isPostgresAuthConfigured } from '@/lib/utils/auth-utils-client';
import { ROLE_PERMISSIONS, normalizeAdminRole } from '@/lib/constants/permissions';
import { getRoleLevelForRole } from '@/lib/server/admin-constants';
import { validatePermissions } from '@/lib/server/security';


// Force Node.js runtime to support AbortSignal.timeout
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Invariant: This route always returns normalized adminRole strings
    // and a filtered, deduplicated Permission[] list.
    // Normalization performed here removes the need for client-side normalization.

    const authWarning: string | null = null;

    // Check if PostgreSQL authentication is configured
    if (!isPostgresAuthConfigured()) {
      const res = json({ success: false, error: 'PostgreSQL auth not configured', adminRole: null, roleLevel: 0, permissions: [] }, 500);
      return res;
    }

    // Use environment variable for backend URL
    const backendUrl = process.env.BACKEND_URL || '';
    
    // Validate BACKEND_URL in production
    if (process.env.NODE_ENV === 'production' && !process.env.BACKEND_URL) {
      console.error('[Auth] BACKEND_URL not configured in production');
      const res = json({ success: false, error: 'BACKEND_URL not configured', adminRole: null, roleLevel: 0, permissions: [] }, 500);
      return res;
    }

    // Check for Authorization header first, fall back to cookie session
    const authHeader = request.headers.get('authorization');
    let accessToken;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } else {
      // Try to get token from cookies
      const cookieStore = await import('next/headers').then(m => m.cookies());
      accessToken = cookieStore.get('access_token')?.value || cookieStore.get('auth_access_token')?.value;
    }

    if (!accessToken) {
      const res = json({ success: false, error: 'Unauthorized', adminRole: null, roleLevel: 0, permissions: [] }, 401);
      return res;
    }

    // Verify token with backend first
    try {
      const verifyResponse = await fetch(`${backendUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!verifyResponse.ok) {
        const res = json({ success: false, error: 'Unauthorized', adminRole: null, roleLevel: 0, permissions: [] }, 401);
        return res;
      }

      const userData = await verifyResponse.json();
      if (!userData.success || !userData.data) {
        const res = json({ success: false, error: 'Unauthorized', adminRole: null, roleLevel: 0, permissions: [] }, 401);
        return res;
      }
    } catch (error) {
      console.error('[Auth] Token verification failed:', error);
      const res = json({ success: false, error: 'Unauthorized', adminRole: null, roleLevel: 0, permissions: [] }, 401);
      return res;
    }

    // Call backend role management system
    try {
      const response = await fetch(`${backendUrl}/api/auth/user-role`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging with fallback support
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        console.warn(`Backend role fetch failed: ${response.status}`);
        // Return default values instead of failing
        const res = json(
          { 
            success: true, 
            adminRole: null,
            roleLevel: 0,
            permissions: []
          },
          200
        );
        if (authWarning) res.headers.set('X-Auth-Warning', authWarning);
        return res;
      }

      const roleData = await response.json();
      
      // Map backend role data to frontend format with normalization
      const adminRole = normalizeAdminRole(roleData.role);
      const roleLevel = roleData.level ?? (adminRole ? getRoleLevelForRole(adminRole) : 0);
      
      // Merge backend permissions with role-based permissions
      const rolePermissionsRaw = adminRole ? ROLE_PERMISSIONS[adminRole] || [] : [];
      const backendPermissionsRaw: unknown[] = roleData.permissions || [];

      // Use validatePermissions for consistent normalization and fallback handling
      const { permissions } = validatePermissions(backendPermissionsRaw, [...rolePermissionsRaw]);

      const res = json(
        { 
          success: true, 
          adminRole,
          roleLevel,
          permissions
        },
        200
      );
      if (authWarning) res.headers.set('X-Auth-Warning', authWarning);
      return res;

    } catch (backendError) {
      console.error('[Auth] Backend role fetch error:', backendError);
      // Fail gracefully - return user without roles
      const res = json(
        { 
          success: true, 
          adminRole: null,
          roleLevel: 0,
          permissions: []
        },
        200
      );
      if (authWarning) res.headers.set('X-Auth-Warning', authWarning);
      return res;
    }

  } catch (error) {
    console.error('[Auth] Unexpected error in user-with-roles:', error);
    const res = json({ success: false, error: 'Internal server error', adminRole: null, roleLevel: 0, permissions: [] }, 500);
    return res;
  }
}
