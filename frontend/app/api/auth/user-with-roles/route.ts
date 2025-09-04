import { NextRequest } from 'next/server';
import { json } from '@/lib/server/route-helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/utils/auth-utils';
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

    let authWarning: string | null = null;

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const res = json({ success: false, error: 'Supabase not configured', adminRole: null, roleLevel: 0, permissions: [] }, 500);
      return res;
    }

    // Use environment variable for backend URL
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    
    // Validate BACKEND_URL in production
    if (process.env.NODE_ENV === 'production' && !process.env.BACKEND_URL) {
      console.error('[Auth] BACKEND_URL not configured in production');
      const res = json({ success: false, error: 'BACKEND_URL not configured', adminRole: null, roleLevel: 0, permissions: [] }, 500);
      return res;
    }

    const supabase = await createServerSupabaseClient();
    
    // Check for Authorization header first, fall back to cookie session
    const authHeader = request.headers.get('authorization');
    let user, accessToken;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data, error } = await supabase.auth.getUser(token);
      
      if (!error && data.user) {
        // Authorization header is valid
        user = data.user;
        accessToken = token;
        
        // Check if cookie session exists and compare user IDs
        const { data: { user: cookieUser } } = await supabase.auth.getUser();
        if (cookieUser && cookieUser.id !== data.user.id) {
          console.warn('[Auth] User mismatch between header token and cookie session');
          authWarning = 'user-mismatch';
          if (process.env.ENFORCE_STRICT_AUTH_MATCH === 'true') {
            const res = json({ success: false, error: 'Unauthorized (user mismatch)' }, 401);
            res.headers.set('X-Auth-Warning', 'user-mismatch');
            return res;
          }
          // Prefer header token as it's more explicit
          // Continue with header user, but log the mismatch
        }
      } else {
        // Authorization header is invalid, try cookie fallback
        console.warn('[Auth] Invalid Authorization header, trying cookie fallback:', error);
        
        const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();
        if (!cookieError && cookieUser) {
          user = cookieUser;
          // Get token from session for backend call
          const { data: { session } } = await supabase.auth.getSession();
          accessToken = session?.access_token;
        } else {
          // Both Authorization header and cookie failed
          console.error('[Auth] Both Authorization header and cookie failed');
          const res = json({ success: false, error: 'Unauthorized', adminRole: null, roleLevel: 0, permissions: [] }, 401);
          return res;
        }
      }
    } else {
      // No Authorization header, use cookie session
      const { data: { user: cookieUser }, error } = await supabase.auth.getUser();
      user = cookieUser;
      
      if (error) {
        console.error('[Auth] Error getting user from cookie session:', error);
        const res = json(
          { 
            success: false, 
            error: 'Unauthorized'
          },
          401
        );
        return res;
      }
      
      // Get token from session for backend call
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token;
    }

    // No session/user is a valid state, not an error
    if (!user) {
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

    if (!accessToken) {
      console.warn('[Auth] Missing access token but user exists, returning default role payload');
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
