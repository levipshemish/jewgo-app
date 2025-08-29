import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/utils/auth-utils';
import { BACKEND_URL } from '@/lib/config/environment';

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
 * Uses the existing ROLE_PERMISSIONS mapping from admin system
 */
function mapRoleToPermissions(role: string | null): string[] {
  if (!role) return [];
  
  // Import the existing permission mappings
  const ROLE_PERMISSIONS = {
    'moderator': [
      'restaurant:view',
      'restaurant:approve',
      'restaurant:reject',
      'review:view',
      'review:moderate',
    ],
    'data_admin': [
      'restaurant:view',
      'restaurant:edit',
      'restaurant:approve',
      'restaurant:reject',
      'review:view',
      'review:moderate',
      'user:view',
      'bulk:operations',
      'data:export',
      'analytics:view',
    ],
    'system_admin': [
      'restaurant:view',
      'restaurant:edit',
      'restaurant:delete',
      'restaurant:approve',
      'restaurant:reject',
      'review:view',
      'review:moderate',
      'review:delete',
      'user:view',
      'user:edit',
      'system:settings',
      'audit:view',
      'bulk:operations',
      'data:export',
    ],
    'super_admin': [
      // All permissions
      'restaurant:view', 'restaurant:edit', 'restaurant:delete', 'restaurant:approve', 'restaurant:reject', 'restaurant:moderate',
      'review:view', 'review:moderate', 'review:delete',
      'user:view', 'user:edit', 'user:delete',
      'image:view', 'image:edit', 'image:delete',
      'system:settings', 'system:view', 'system:edit', 'audit:view', 'audit:delete',
      'bulk:operations', 'data:export', 'role:view', 'role:edit', 'role:delete',
      'synagogue:view', 'kosher_place:view', 'analytics:view'
    ]
  };
  
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
}
