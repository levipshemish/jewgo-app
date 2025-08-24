import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateRedirectUrl, isPrivateRelayEmail } from '@/lib/utils/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    const next = searchParams.get('next') || searchParams.get('redirectTo') || '/location-access';
    const safeNext = validateRedirectUrl(next);

    // Utility to build a redirect response and clear oauth_state cookie on the client
    const redirectWithStateClear = (target: string | URL) => {
      const url = target instanceof URL ? target : new URL(target, request.url);
      const res = NextResponse.redirect(url, 302);
      res.cookies.set('oauth_state', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      });
      return res;
    };

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error received:', error);
      const errorUrl = new URL('/auth/signin', request.url);
      errorUrl.searchParams.set('error', error);
      return redirectWithStateClear(errorUrl);
    }

    if (!code) {
      console.error('OAuth callback missing authorization code');
      return redirectWithStateClear('/auth/signin?error=no_code');
    }

    // Validate state using double-submit cookie
    try {
      const cookieStore = await cookies();
      const cookieState = cookieStore.get('oauth_state')?.value;

      if (!cookieState || !state || cookieState !== state) {
        console.error('OAuth state validation failed');
        return redirectWithStateClear('/auth/signin?error=invalid_state');
      }
    } catch (err) {
      console.error('OAuth state cookie validation error:', err);
      return redirectWithStateClear('/auth/signin?error=state_error');
    }

    // Perform server-side code exchange
    const supabase = await createServerSupabaseClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('OAuth code exchange failed:', exchangeError);
      return redirectWithStateClear('/auth/signin?error=invalid_grant');
    }

    // Get user data
    const { data: { user } } = await supabase.auth.getUser();
    const target = new URL(safeNext, request.url);
    if (user?.email && isPrivateRelayEmail(user.email)) {
      // Append relay hint for onboarding UX
      if (!target.searchParams.has('relay')) {
        target.searchParams.set('relay', '1');
      }
    }

    // Redirect to the validated next URL (and clear state cookie)
    return redirectWithStateClear(target);

  } catch (error) {
    console.error('OAuth callback processing failed:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url));
  }
}
