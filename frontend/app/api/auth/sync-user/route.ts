import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCORSHeaders, ALLOWED_ORIGINS } from '@/lib/config/environment';
import { validateCSRFServer } from '@/lib/utils/auth-utils.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin)
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const baseHeaders = getCORSHeaders(origin || undefined);

  try {
    // Create SSR Supabase client bound to cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options, maxAge: 0 }); },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      // Log authentication failure for debugging
      console.error('Authentication failed in sync-user:', {
        error: userError?.message,
        hasUser: !!user,
        isProduction: process.env.NODE_ENV === 'production'
      });
      
      // In production, return a more graceful response for unauthenticated users
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ user: null }, { status: 200, headers: baseHeaders });
      }
      
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401, headers: baseHeaders });
    }

    // Transform user data for client consumption
    const transformedUser = {
      id: user.id,
      email: user.email || undefined,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      username: user.user_metadata?.username,
      provider: user.app_metadata?.provider || 'unknown',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return NextResponse.json({ user: transformedUser }, { status: 200, headers: baseHeaders });

  } catch (_error) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500, headers: baseHeaders });
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const csrfToken = request.headers.get('x-csrf-token');
  const baseHeaders = getCORSHeaders(origin || undefined);

  // CSRF validation. OAuth-success page calls from same origin, so Origin+Referer should be present.
  if (!validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403, headers: baseHeaders });
  }

  try {
    const { name, avatar_url } = await request.json().catch(() => ({}));

    // Create SSR Supabase client bound to cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options, maxAge: 0 }); },
        },
      }
    );

    // Require authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401, headers: baseHeaders });
    }

    // Prepare profile data with safe defaults
    const display_name = (name && String(name).trim()) || user.user_metadata?.full_name || user.user_metadata?.name || '';

    // Check if profile exists to avoid overwriting preferences on repeat sync
    const { data: existingProfile, error: _getError } = await supabase
      .from('profiles')
      .select('id, preferences')
      .eq('id', user.id)
      .single();

    // Default preferences on first insert
    const defaultPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      publicProfile: true,
      showLocation: false,
    };

    const upsertPayload: any = {
      id: user.id,
      display_name,
      updated_at: new Date().toISOString(),
    };

    if (!existingProfile || (_getError as any)?.code === 'PGRST116') {
      upsertPayload.preferences = defaultPreferences;
    }

    // Upsert into profiles table (idempotent)
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(upsertPayload)
      .select()
      .single();

    if (upsertError) {
      // Do not leak DB internals
      return NextResponse.json({ error: 'PROFILE_SYNC_FAILED' }, { status: 500, headers: baseHeaders });
    }

    // Update auth metadata (best-effort)
    await supabase.auth.updateUser({
      data: {
        profile: {
          display_name,
          avatar_url: avatar_url || user.user_metadata?.avatar_url || null,
        }
      }
    }).catch(() => undefined);

    return NextResponse.json({ ok: true }, { status: 200, headers: baseHeaders });

  } catch (_error) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500, headers: baseHeaders });
  }
}
