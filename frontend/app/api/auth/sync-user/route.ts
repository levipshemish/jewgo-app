import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { transformSupabaseUser, isSupabaseConfigured } from '@/lib/utils/auth-utils';

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

    // Get user's JWT token for role fetching
    const { data: { session } } = await supabase.auth.getSession();
    const userToken = session?.access_token;

    // Transform the user with role information if token is available
    const transformedUser = await transformSupabaseUser(user, {
      includeRoles: !!userToken,
      userToken: userToken || undefined
    });

    return NextResponse.json(
      { 
        success: true, 
        user: transformedUser 
      },
      { status: 200 }
    );

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
