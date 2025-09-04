import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/utils/auth-utils';
import type { TransformedUser } from '@/lib/types/supabase-auth';
import { ROLE_PERMISSIONS, normalizeAdminRole, type Permission } from '@/lib/constants/permissions';
import { validatePermissions } from '@/lib/server/security';
import { errorResponses, createSuccessResponse } from '@/lib';

export async function GET(_request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase not configured',
          user: null 
        },
        { status: 500 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[Auth] Error getting user:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication error',
          user: null 
        },
        { status: 401 }
      );
    }

    // No session/user is a valid state, not an error
    if (!user) {
      return NextResponse.json(
        { 
          success: true, 
          user: null 
        },
        { status: 200 }
      );
    }

    // Build base transformed user inline to avoid internal HTTP hops
    const baseUser: TransformedUser = {
      id: user.id,
      email: user.email || undefined,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      username: user.user_metadata?.username,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      provider: (user.app_metadata?.provider ?? 'unknown') as any,
      providerInfo: { name: 'Supabase', icon: '🔐', color: '#0EA5E9', displayName: 'Supabase' },
      createdAt: user.created_at || undefined,
      updatedAt: user.updated_at || undefined,
      isEmailVerified: (user.user_metadata as any)?.email_verified || false,
      isPhoneVerified: (user.user_metadata as any)?.phone_verified || false,
      role: 'user',
      subscriptionTier: 'free',
      permissions: [],
      adminRole: null,
      roleLevel: 0,
      isSuperAdmin: false
    };

    // If we have a token, enrich with roles inline
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (accessToken) {
      try {
        // Prefer explicit BACKEND_URL, fallback to NEXT_PUBLIC_BACKEND_URL, then localhost
        const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const resp = await fetch(`${backendUrl}/api/auth/user-role`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        if (resp.ok) {
          const roleData = await resp.json();
          const adminRole = normalizeAdminRole(roleData.role);
          const roleLevel = roleData.level || 0;
          const rolePermissionsRaw = adminRole ? ROLE_PERMISSIONS[adminRole] || [] : [];
          const backendPermissionsRaw: unknown[] = roleData.permissions || [];
          const { permissions } = validatePermissions(backendPermissionsRaw, [...rolePermissionsRaw]);
          baseUser.adminRole = adminRole;
          baseUser.roleLevel = roleLevel;
          baseUser.permissions = permissions as Permission[];
          baseUser.isSuperAdmin = adminRole === 'super_admin';
        }
      } catch (_e) {
        // proceed without roles
      }
    }

    return NextResponse.json({ success: true, user: baseUser }, { status: 200 });

  } catch (error) {
    console.error('[Auth] Unexpected error in sync-user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        user: null 
      },
      { status: 500 }
    );
  }
}
