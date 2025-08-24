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
    const tokenHash = searchParams.get('token_hash');
    const otpType = searchParams.get('type');
    const next = searchParams.get('next') || searchParams.get('redirectTo') || '/location-access';
    const safeNext = validateRedirectUrl(next);

    // Utility to build a redirect response and clear oauth_state cookie on the client
    const redirectWithStateClear = async (target: string | URL) => {
      const url = target instanceof URL ? target : new URL(target, request.url);
      const res = NextResponse.redirect(url, 302);
      // Clear our optional state cookie
      res.cookies.set('oauth_state', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      });
      // Propagate any cookies set during exchange/verify onto the redirect response
      try {
        const store = await cookies();
        store.getAll().forEach((c) => {
          res.cookies.set(c.name, c.value, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        });
      } catch {}
      return res;
    };

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error received:', error);
      const errorUrl = new URL('/auth/signin', request.url);
      errorUrl.searchParams.set('error', error);
      return redirectWithStateClear(errorUrl);
    }

    // If neither code nor token_hash present, bail
    if (!code && !tokenHash) {
      console.error('Auth callback missing required parameters');
      return redirectWithStateClear('/auth/signin?error=missing_params');
    }

    // Validate state only if our cookie exists and state param present
    if (state) {
      try {
        const cookieStore = await cookies();
        const cookieState = cookieStore.get('oauth_state')?.value;
        if (cookieState && cookieState !== state) {
          console.error('OAuth state validation failed');
          return redirectWithStateClear('/auth/signin?error=invalid_state');
        }
      } catch (err) {
        console.error('OAuth state cookie validation error:', err);
        return redirectWithStateClear('/auth/signin?error=state_error');
      }
    }

    // Perform server-side session establishment
    const supabase = await createServerSupabaseClient();
    if (code) {
      // Works for both OAuth and magic link flows that provide 'code'
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('Auth code exchange failed:', exchangeError);
        return redirectWithStateClear('/auth/signin?error=invalid_grant');
      }
    } else if (tokenHash && otpType) {
      // Fallback for email OTP flows that provide token_hash + type
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType as any });
      if (verifyError) {
        console.error('OTP verification failed:', verifyError);
        return redirectWithStateClear('/auth/signin?error=otp_invalid');
      }
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
