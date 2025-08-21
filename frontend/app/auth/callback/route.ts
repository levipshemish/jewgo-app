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
    const state = searchParams.get('state');
    const provider = searchParams.get('provider');
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
      const provider = detectProvider(user);
      logOAuthEvent(user.id, provider, 'callback_success');
      
      // Enforce Apple OAuth feature flag only for Apple users
      if (provider === 'apple' && !isAppleOAuthEnabled()) {
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
          
          if (reauth && provider) {
            // This is a re-authentication flow - attempt to link identities
            try {
              // For re-authentication, we can attempt to link the identities
              // This is safer because the user has just re-authenticated
              oauthLogger.info('Re-authentication flow detected, attempting identity linking', { 
                userId: user.id,
                reauthProvider: provider
              });
              
              // Complete the identity linking
              const linkingResult = await completeIdentityLinking(user.id, provider);
              
              if (linkingResult.success) {
                // Redirect to account page with success message
                const accountUrl = new URL('/account', request.url);
                accountUrl.searchParams.set('linked', 'true');
                return NextResponse.redirect(accountUrl);
              } else {
                oauthLogger.error('Re-authentication linking failed', { 
                  error: linkingResult.error,
                  userId: user.id 
                });
                // Fall through to normal collision handling
              }
            } catch (linkError) {
              oauthLogger.error('Re-authentication linking failed', { 
                errorType: linkError instanceof Error ? linkError.constructor.name : 'Unknown',
                userId: user.id 
              });
              // Fall through to normal collision handling
            }
          }
          
          // Store collision info in URL params for the linking page
          const linkUrl = new URL('/account/link', request.url);
          linkUrl.searchParams.set('collision', 'true');
          linkUrl.searchParams.set('providers', user.identities.map(id => id.provider).join(','));
          
          // Redirect to guarded linking flow when collision is inferred
          return NextResponse.redirect(linkUrl);
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
        const matchingIdentity = user.identities?.find(identity => identity.provider === provider);
        const providerUserId = matchingIdentity?.identity_data?.sub || null;
        await persistAppleUserName(user.id, name, provider, providerUserId);
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
