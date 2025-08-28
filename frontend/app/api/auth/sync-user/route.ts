import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { transformSupabaseUser, isSupabaseConfigured } from '@/lib/utils/auth-utils';

export async function GET(request: NextRequest) {
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

    if (!user) {
      return NextResponse.json(
        { 
          success: true, 
          user: null 
        },
        { status: 200 }
      );
    }

    // Transform the user to match the expected format
    const transformedUser = transformSupabaseUser(user);

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
