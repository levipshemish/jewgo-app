import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateRedirectUrl } from '@/lib/utils/auth-utils';
import { detectProvider, isAppleUser, persistAppleUserName, logOAuthEvent, isAppleOAuthEnabled, completeIdentityLinking } from '@/lib/utils/auth-utils.server';
import { oauthLogger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const next = searchParams.get('next') || searchParams.get('redirectTo') || '/location-access';
    const reauth = searchParams.get('reauth') === 'true';
    const _link_state = searchParams.get('link_state');
    const _provider = searchParams.get('provider');
    const safeNext = validateRedirectUrl(next);

    // Handle OAuth errors
    if (error) {
      // Log sanitized error code only, not raw error payload
      oauthLogger.error('OAuth error received', { errorCode: error });
      const errorUrl = new URL('/auth/signin', request.url);
      errorUrl.searchParams.set('error', error);
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      oauthLogger.error('OAuth callback missing authorization code');
      return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url));
    }

    // Early Apple OAuth feature flag check to prevent unnecessary code exchange
    const provider = searchParams.get('provider');
    if (provider === 'apple' && !isAppleOAuthEnabled()) {
      oauthLogger.warn('Apple OAuth callback received but feature is disabled');
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Note: Removed early provider gating to prevent spoofing attacks
    // Provider validation now happens after successful code exchange

    // Perform server-side code exchange
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      // Log sanitized error information only
      oauthLogger.error('OAuth code exchange failed', { 
        errorType: exchangeError.name || 'Unknown',
        errorCode: exchangeError.status || 'unknown'
      });
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_grant', request.url));
    }

    // Get user data and perform post-authentication processing
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const detectedProvider = detectProvider(user);
      logOAuthEvent(user.id, detectedProvider, 'callback_success');
      
      // Enforce Apple OAuth feature flag only for Apple users
      if (detectedProvider === 'apple' && !isAppleOAuthEnabled()) {
        // Sign out to avoid leaving an Apple session established when the feature is disabled
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // Handle identity collision detection for re-authentication flows
      try {
        const providers = user.identities?.map(i => i.provider) ?? [];
        if (reauth && _provider && !providers.includes(_provider)) {
          oauthLogger.info('Re-authentication required for identity linking', { 
            userId: user.id, 
            targetProvider: _provider,
            existingProviders: providers
          });
          
          const settingsUrl = new URL('/profile/settings', request.url);
          settingsUrl.searchParams.set('link', 'required');
          return NextResponse.redirect(settingsUrl);
        }
      } catch (linkError) {
        oauthLogger.error('Identity linking attempt failed', { 
          errorType: linkError instanceof Error ? linkError.constructor.name : 'Unknown',
          userId: user.id 
        });
        // Continue with normal flow - don't block user authentication
      }
      
      // Handle Apple-specific name persistence
      if (isAppleUser(user)) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || null;
        // Find the identity whose provider matches the detected provider
        const matchingIdentity = user.identities?.find(identity => identity.provider === detectedProvider);
        const providerUserId = matchingIdentity?.identity_data?.sub || null;
        await persistAppleUserName(user.id, name, detectedProvider, providerUserId);
      }
    }

    // Redirect to the validated next URL
    return NextResponse.redirect(new URL(safeNext, request.url));

  } catch (error) {
    oauthLogger.error('OAuth callback processing failed', { 
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
    return NextResponse.redirect(new URL('/auth/signin?error=callback_failed', request.url));
  }
}
