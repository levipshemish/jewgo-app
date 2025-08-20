import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  persistAppleUserName, 
  detectProvider, 
  isAppleUser, 
  isPrivateRelayEmail,
  isAppleOAuthEnabled,
  logOAuthEvent,
  attemptIdentityLinking
} from '@/lib/utils/auth-utils.server';
import { validateRedirectUrl } from '@/lib/utils/auth-utils';

// Node.js runtime for reliable session management
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Server-side Supabase client
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Check server-side feature flag
    if (!isAppleOAuthEnabled()) {
      console.log('[OAUTH] Apple OAuth disabled, redirecting to home');
      return NextResponse.redirect(new URL('/', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const next = searchParams.get('next') || '/';

    // Handle OAuth errors
    if (error) {
      console.error('[OAUTH] OAuth error:', error);
      const errorUrl = new URL('/auth/signin', request.url);
      errorUrl.searchParams.set('error', error);
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      console.error('[OAUTH] No authorization code received');
      return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url));
    }

    // Exchange code for session
    const { data, error: exchangeError } = await supabaseServer.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('[OAUTH] Session exchange error:', exchangeError);
      return NextResponse.redirect(new URL('/auth/signin?error=session_exchange_failed', request.url));
    }

    if (!data.user) {
      console.error('[OAUTH] No user data in session');
      return NextResponse.redirect(new URL('/auth/signin?error=no_user_data', request.url));
    }

    const user = data.user;
    const provider = detectProvider(user);
    
    // Log OAuth event with PII-safe analytics
    logOAuthEvent(user.id, provider, 'callback_success');

    // Handle Apple-specific logic
    if (isAppleUser(user)) {
      console.log('[OAUTH] Processing Apple user:', user.id);
      
      // Check for private relay email
      if (user.email && isPrivateRelayEmail(user.email)) {
        console.log('[OAUTH] Apple user with private relay email:', user.email);
      }

      // Persist Apple user name if provided (first consent only)
      const appleName = user.user_metadata?.full_name || user.user_metadata?.name;
      if (appleName && appleName.trim()) {
        console.log('[OAUTH] Persisting Apple user name for user:', user.id);
        await persistAppleUserName(
          user.id, 
          appleName, 
          'apple', 
          user.app_metadata?.provider_user_id
        );
      } else {
        console.log('[OAUTH] No Apple name provided for user:', user.id);
      }

      // Handle identity linking if email matches existing account
      if (user.email) {
        try {
          const linkResult = await attemptIdentityLinking(user.id, 'apple');
          if (linkResult.conflict) {
            console.log('[OAUTH] Identity linking conflict detected for user:', user.id);
            // Redirect to conflict resolution page
            const conflictUrl = new URL('/auth/identity-conflict', request.url);
            conflictUrl.searchParams.set('provider', 'apple');
            return NextResponse.redirect(conflictUrl);
          }
        } catch (linkError) {
          console.error('[OAUTH] Identity linking error:', linkError);
          // Continue with normal flow - don't block user
        }
      }
    }

    // Validate redirect URL with corrected validation
    const safeRedirectUrl = validateRedirectUrl(next);
    const redirectUrl = new URL(safeRedirectUrl, request.url);

    // Set session cookies and redirect
    const response = NextResponse.redirect(redirectUrl);
    
    // Set auth cookies if needed
    if (data.session) {
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.session.expires_in
      });
      
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    return response;

  } catch (error) {
    console.error('[OAUTH] Callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url));
  }
}
