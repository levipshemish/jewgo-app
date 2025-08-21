import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateRedirectUrl } from '@/lib/utils/auth-utils';
import { detectProvider, isAppleUser, persistAppleUserName, logOAuthEvent, isAppleOAuthEnabled } from '@/lib/utils/auth-utils.server';
import { oauthLogger } from '@/lib/utils/logger';

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
      oauthLogger.error('OAuth error', { error });
      const errorUrl = new URL('/auth/signin', request.url);
      errorUrl.searchParams.set('error', error);
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      oauthLogger.error('No authorization code received');
      return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url));
    }

    // Note: Removed early provider gating to prevent spoofing attacks
    // Provider validation now happens after successful code exchange

    // Perform server-side code exchange
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      oauthLogger.error('Code exchange error', { error: exchangeError.message });
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
      
      // Handle reactive identity collision using official Supabase APIs
      try {
        // Check if user has multiple identities (potential collision)
        if (user.identities && user.identities.length > 1) {
          oauthLogger.info('Multiple identities detected, fallback to safeNext', { 
            userId: user.id, 
            identityCount: user.identities.length 
          });
          
          // Fallback to safeNext instead of unimplemented /account/link route
          // TODO: Reintroduce this redirect when /account/link flow is implemented
        }
      } catch (linkError) {
        oauthLogger.error('Identity linking attempt failed', { 
          error: linkError instanceof Error ? linkError.message : 'Unknown error',
          userId: user.id 
        });
        // Continue with normal flow - don't block user authentication
      }
      
      // Handle Apple-specific name persistence
      if (isAppleUser(user)) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || null;
        // Find the identity whose provider matches the detected provider
        const matchingIdentity = user.identities?.find(identity => identity.provider === provider);
        const providerUserId = matchingIdentity?.identity_data?.sub || null;
        await persistAppleUserName(user.id, name, provider, providerUserId);
      }
    }

    // Redirect to the validated next URL
    return NextResponse.redirect(new URL(safeNext, request.url));

  } catch (error) {
    oauthLogger.error('Callback error', { error });
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url));
  }
}
