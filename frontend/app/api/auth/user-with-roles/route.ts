import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/utils/auth-utils';
import { BACKEND_URL } from '@/lib/config/environment';
import { ROLE_PERMISSIONS, Role, Permission } from '@/lib/constants/permissions';

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

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[Auth] Error getting user for roles:', error);
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

    // Get the user's JWT token to send to backend
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid session',
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
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
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
      
      // Map backend role data to frontend format
      const adminRole = roleData.role || null;
      const roleLevel = roleData.level || 0;
      
      // Map role to permissions using existing permission system
      const permissions = mapRoleToPermissions(adminRole);

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

/**
 * Map backend role to frontend permissions
 * Uses the shared ROLE_PERMISSIONS mapping from constants
 */
function mapRoleToPermissions(role: string | null): readonly Permission[] {
  if (!role) return [];
  
  return ROLE_PERMISSIONS[role as Role] || [];
}
