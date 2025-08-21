import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateRedirectUrl } from '@/lib/utils/auth-utils';
import { detectProvider, isAppleUser, persistAppleUserName, logOAuthEvent, isAppleOAuthEnabled } from '@/lib/utils/auth-utils.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const safeNext = validateRedirectUrl(searchParams.get('next'));

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

    // Perform server-side code exchange
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('[OAUTH] Code exchange error:', exchangeError);
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_grant', request.url));
    }

    // Get user data and perform post-authentication processing
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const provider = detectProvider(user);
      logOAuthEvent(user.id, provider, 'callback_success');
      
      // Enforce Apple OAuth feature flag only for Apple users
      if (provider === 'apple' && !isAppleOAuthEnabled()) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // Note: Reactive identity collision detection would be implemented here
      // using official Supabase APIs when available. For now, we continue with
      // normal flow and rely on Supabase's built-in collision handling.
      
      // Handle Apple-specific name persistence
      if (isAppleUser(user)) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || null;
        // Pass provider and provider_user_id if available from identities
        const providerUserId = user.identities?.[0]?.identity_data?.sub || null;
        await persistAppleUserName(user.id, name, provider, providerUserId);
      }
    }

    // Redirect to the validated next URL
    return NextResponse.redirect(new URL(safeNext, request.url));

  } catch (error) {
    console.error('[OAUTH] Callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url));
  }
}
