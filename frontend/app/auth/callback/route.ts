import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { 
  persistAppleUserName, 
  detectProvider, 
  isAppleUser, 
  isPrivateRelayEmail,
  isAppleOAuthEnabled,
  logOAuthEvent,
  attemptIdentityLinking,
  createAnalyticsKey
} from '@/lib/utils/auth-utils.server';
import { validateRedirectUrl } from '@/lib/utils/auth-utils';

// Node.js runtime for reliable session management
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
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

    // For SSR compatibility, we'll redirect to the client-side auth handler
    // The client-side will handle the code exchange
    const redirectUrl = new URL('/auth/oauth-success', request.url);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('next', next);
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[OAUTH] Callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url));
  }
}
