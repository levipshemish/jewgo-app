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
    const next = searchParams.get('next') || searchParams.get('redirectTo');
    const reauth = searchParams.get('reauth') === 'true';
    const _state = searchParams.get('state');
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

    // Early short-circuit for Apple OAuth feature flag
    if (!isAppleOAuthEnabled() && _provider === 'apple') {
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
      
      // Handle reactive identity collision using official Supabase APIs
      try {
        // Check if user has multiple identities (potential collision)
        if (user.identities && user.identities.length > 1) {
          oauthLogger.info('Multiple identities detected, redirecting to linking flow', { 
            userId: user.id, 
            identityCount: user.identities.length,
            providers: user.identities.map(id => id.provider),
            isReauth: reauth
          });
          
          if (reauth && detectedProvider) {
            // This is a re-authentication flow - attempt to link identities
            try {
              // For re-authentication, we can attempt to link the identities
              // This is safer because the user has just re-authenticated
              oauthLogger.info('Re-authentication flow detected, attempting identity linking', { 
                userId: user.id,
                reauthProvider: detectedProvider
              });
              
              // Complete the identity linking
              const linkingResult = await completeIdentityLinking(user.id, detectedProvider);
              
              if (linkingResult.success) {
                // Redirect to profile settings page with success message
                const settingsUrl = new URL('/profile/settings', request.url);
                settingsUrl.searchParams.set('linked', 'true');
                return NextResponse.redirect(settingsUrl);
              } else {
                oauthLogger.error('Re-authentication linking failed', { 
                  error: linkingResult.error,
                  userId: user.id 
                });
                // Redirect to profile settings with collision flag for guarded UX
                const settingsUrl = new URL('/profile/settings', request.url);
                settingsUrl.searchParams.set('collision', 'true');
                return NextResponse.redirect(settingsUrl);
              }
            } catch (linkError) {
              oauthLogger.error('Re-authentication linking failed', { 
                errorType: linkError instanceof Error ? linkError.constructor.name : 'Unknown',
                userId: user.id 
              });
              // Fall through to normal collision handling
            }
          }
          
          // Store collision info in URL params for the profile settings page
          const settingsUrl = new URL('/profile/settings', request.url);
          settingsUrl.searchParams.set('collision', 'true');
          settingsUrl.searchParams.set('providers', user.identities.map(id => id.provider).join(','));
          
          // Redirect to guaranteed route when collision is inferred
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
