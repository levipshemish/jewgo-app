import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/utils/auth-utils';
import { BACKEND_URL } from '@/lib/config/environment';
import { ROLE_PERMISSIONS, Role, Permission } from '@/lib/constants/permissions';
import { createTimeoutSignal } from '@/lib/utils/timeout-utils';

// Force Node.js runtime to support AbortSignal.timeout
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase not configured',
          adminRole: null,
          roleLevel: 0,
          permissions: []
        },
        { status: 500 }
      );
    }

    // Validate BACKEND_URL in production
    if (process.env.NODE_ENV === 'production' && !BACKEND_URL) {
      console.error('[Auth] BACKEND_URL not configured in production');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend not configured',
          adminRole: null,
          roleLevel: 0,
          permissions: []
        },
        { status: 500 }
      );
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
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid authorization token',
              adminRole: null,
              roleLevel: 0,
              permissions: []
            },
            { status: 401 }
          );
        }
      }
    } else {
      // No Authorization header, use cookie session
      const { data: { user: cookieUser }, error } = await supabase.auth.getUser();
      user = cookieUser;
      
      if (error) {
        console.error('[Auth] Error getting user from cookie session:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication error',
            adminRole: null,
            roleLevel: 0,
            permissions: []
          },
          { status: 401 }
        );
      }
      
      // Get token from session for backend call
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token;
    }

    // No session/user is a valid state, not an error
    if (!user) {
      return NextResponse.json(
        { 
          success: true, 
          adminRole: null,
          roleLevel: 0,
          permissions: []
        },
        { status: 200 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid access token',
          adminRole: null,
          roleLevel: 0,
          permissions: []
        },
        { status: 401 }
      );
    }

    // Call backend role management system
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/user-role`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging with fallback support
        signal: createTimeoutSignal(5000)
      });

      if (!response.ok) {
        console.warn(`Backend role fetch failed: ${response.status}`);
        // Return default values instead of failing
        return NextResponse.json(
          { 
            success: true, 
            adminRole: null,
            roleLevel: 0,
            permissions: []
          },
          { status: 200 }
        );
      }

      const roleData = await response.json();
      
      // Map backend role data to frontend format with normalization
      const role = (roleData.role || '').toLowerCase();
      const adminRole = role || null;
      const roleLevel = roleData.level || 0;
      
      // Map role to permissions using existing permission system
      const permissions = ROLE_PERMISSIONS[adminRole as Role] || [];

      return NextResponse.json(
        { 
          success: true, 
          adminRole,
          roleLevel,
          permissions
        },
        { status: 200 }
      );

    } catch (backendError) {
      console.error('[Auth] Backend role fetch error:', backendError);
      // Fail gracefully - return user without roles
      return NextResponse.json(
        { 
          success: true, 
          adminRole: null,
          roleLevel: 0,
          permissions: []
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('[Auth] Unexpected error in user-with-roles:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        adminRole: null,
        roleLevel: 0,
        permissions: []
      },
      { status: 500 }
    );
  }
}

