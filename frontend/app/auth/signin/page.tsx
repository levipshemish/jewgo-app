"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useState, Suspense, useEffect } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import { validateRedirectUrl, mapAppleOAuthError, extractIsAnonymous } from "@/lib/utils/auth-utils";
import { AppleSignInButton } from "@/components/ui/AppleSignInButton";
import { shouldRedirectToSetup } from "@/lib/utils/apple-oauth-config";
import { getClientConfig } from "@/lib/config/client-config";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { useCaptcha } from "@/hooks/useCaptcha";

// Separate component to handle search params with proper Suspense boundary
function SignInFormWithParams() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || searchParams.get('redirectTo') || '/location-access';
  const errorParam = searchParams.get("error");
  const reauth = searchParams.get("reauth") === 'true';
  const provider = searchParams.get("provider");
  const state = searchParams.get("state");
  
  return <SignInForm redirectTo={next} initialError={errorParam} reauth={reauth} provider={provider} state={state} />;
}

function SignInForm({ redirectTo, initialError, reauth, provider, state }: { 
  redirectTo: string; 
  initialError?: string | null;
  reauth?: boolean;
  provider?: string | null;
  state?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [guestPending, setGuestPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ? mapAppleOAuthError(initialError) : null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Initialize with the correct value to avoid flash
  const [appleOAuthEnabled, setAppleOAuthEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const config = getClientConfig();
      return config.appleOAuthEnabled;
    }
    return false;
  });
  const router = useRouter();

  // CAPTCHA management
  const {
    state: captchaState,
    turnstileRef,
    incrementAttempts,
    handleCaptchaVerify,
    handleCaptchaError,
    handleCaptchaExpired,
    resetCaptcha,
    clearError: clearCaptchaError
  } = useCaptcha({
    maxAttempts: 3,
    onRateLimitExceeded: () => {
      setError('Too many attempts. Please wait before trying again.');
    }
  });

  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        
        if (error) {
          setDebugInfo(`Connection error: ${error.message}`);
          return;
        }
        
        if (session?.user) {
          // User is already authenticated, redirect them
          console.log('User already authenticated, redirecting to:', redirectTo);
          router.push(redirectTo);
          return;
        }
        
        setDebugInfo("Supabase connection OK - No active session");
      } catch (err) {
        setDebugInfo(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    
    checkAuthentication();
    
    // Check Apple OAuth configuration
    const config = getClientConfig();
    setAppleOAuthEnabled(config.appleOAuthEnabled);
  }, [redirectTo, router]);

  const onEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    clearCaptchaError();
    
    try {
      // Check if Turnstile is required and verified
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isTestKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === '1x00000000000000000000AA';
      
      // Get current token from state or widget ref
      let currentToken = captchaState.token;
      if (!currentToken && turnstileRef.current) {
        currentToken = turnstileRef.current.getToken();
        console.log('Got token directly from widget ref:', currentToken ? 'TOKEN_PRESENT' : 'NO_TOKEN');
      }

      // In development with test keys, skip Turnstile verification
      if (isDevelopment && isTestKey) {
        console.log('Development mode: Skipping Turnstile verification for email sign-in');
      } else if (captchaState.isRequired && !captchaState.isVerified) {
        console.log('Turnstile verification required but not completed for email sign-in');
        // Check if Turnstile is configured
        const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (!turnstileSiteKey) {
          setError('Email sign-in is temporarily unavailable. Please try again later.');
          setPending(false);
          return;
        }
        
        if (currentToken) {
          console.log('Found Turnstile token, proceeding despite verification state');
        } else {
          setError('Please complete the security check to continue.');
          setPending(false);
          return;
        }
      }

      console.log('Turnstile verification completed, proceeding with email sign-in');

      // Increment attempts for rate limiting
      incrementAttempts();

      // Prepare request body with Turnstile token
      const requestBody: any = {
        email,
        password,
        turnstileToken: isDevelopment && isTestKey ? 'DEVELOPMENT_BYPASS' : (currentToken || captchaState.token)
      };

      console.log('Sending email sign-in request with token:', isDevelopment && isTestKey ? 'DEVELOPMENT_BYPASS' : ((currentToken || captchaState.token) ? 'TOKEN_PRESENT' : 'NO_TOKEN'));

      // Fetch CSRF token for defense-in-depth
      let csrfToken: string | undefined;
      try {
        const csrfRes = await fetch('/api/auth/csrf', { method: 'GET', credentials: 'include' });
        const csrfJson = await csrfRes.json();
        csrfToken = csrfJson?.token;
      } catch (e) {
        console.warn('Failed to fetch CSRF token, proceeding with origin/referer checks only');
      }

      // Call the email auth API endpoint instead of Supabase directly
      const response = await fetch('/api/auth/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('Email sign-in API response:', { status: response.status, result });

      if (!response.ok) {
        if (result.error === 'TURNSTILE_REQUIRED') {
          setError('Security verification required. Please complete the challenge below.');
          // Reset Turnstile to show it
          resetCaptcha();
        } else if (result.error === 'TURNSTILE_FAILED') {
          setError('Security verification failed. Please try again.');
          // Reset Turnstile for retry
          if (turnstileRef.current) {
            turnstileRef.current.reset();
          }
        } else if (result.error === 'RATE_LIMITED') {
          setError(`Too many attempts. Please wait ${result.retry_after || 60} seconds before trying again.`);
        } else {
          setError(result.error || 'Sign in failed. Please try again.');
        }
        return;
      }

      // Success - redirect
      console.log('Email sign-in redirect check:', { resultOk: result.ok, result });
      if (result.ok) {
        console.log('Email sign-in successful, redirecting to /eatery');
        router.push('/eatery');
      } else {
        console.log('Email sign-in failed, showing error');
        setError('Sign in failed. Please try again.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Sign in error:', err);
      setError('Sign in failed');
    } finally {
      setPending(false);
    }
  };

  const onGuestSignIn = async () => {
    setGuestPending(true);
    setError(null);
    clearCaptchaError();
    
    try {
      // Single-flight protection
      if (guestPending) {
        return;
      }

      // Debug: Log captcha state
      console.log('Guest sign-in - Captcha state:', captchaState);
      
      // Get current token from state or widget ref
      let currentToken = captchaState.token;
      if (!currentToken && turnstileRef.current) {
        currentToken = turnstileRef.current.getToken();
        console.log('Got token directly from widget ref:', currentToken ? 'TOKEN_PRESENT' : 'NO_TOKEN');
      }

      // Check for existing anonymous session first
      const { data: { user }, error: getUserError } = await supabaseBrowser.auth.getUser();
      
      if (!getUserError && user && extractIsAnonymous(user)) {
        // User already has anonymous session, redirect
        router.push('/eatery');
        return;
      }

      // Check if Turnstile is required and verified
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isTestKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === '1x00000000000000000000AA';
      
      // In development with test keys, skip Turnstile verification
      if (isDevelopment && isTestKey) {
        console.log('Development mode: Skipping Turnstile verification');
      } else if (captchaState.isRequired && !captchaState.isVerified) {
        console.log('Turnstile verification required but not completed');
        // Check if Turnstile is configured
        const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (!turnstileSiteKey) {
          setError('Guest sign-in is temporarily unavailable. Please try again later or sign in with an account.');
          setGuestPending(false);
          return;
        }
        
        // Try to get token directly from widget ref if state hasn't updated yet
        let currentToken = captchaState.token;
        if (!currentToken && turnstileRef.current) {
          currentToken = turnstileRef.current.getToken();
          console.log('Got token directly from widget ref:', currentToken ? 'TOKEN_PRESENT' : 'NO_TOKEN');
        }
        
        if (currentToken) {
          console.log('Found Turnstile token, proceeding despite verification state');
        } else {
          setError('Please complete the security check to continue.');
          setGuestPending(false);
          return;
        }
      }

      console.log('Turnstile verification completed, proceeding with guest sign-in');

      // Increment attempts for rate limiting
      incrementAttempts();

      // Prepare request body with Turnstile token
      const requestBody: any = {
        turnstileToken: isDevelopment && isTestKey ? 'DEVELOPMENT_BYPASS' : (currentToken || captchaState.token)
      };

      console.log('Sending guest sign-in request with token:', isDevelopment && isTestKey ? 'DEVELOPMENT_BYPASS' : ((currentToken || captchaState.token) ? 'TOKEN_PRESENT' : 'NO_TOKEN'));

      // Fetch CSRF token for defense-in-depth
      let csrfToken: string | undefined;
      try {
        const csrfRes = await fetch('/api/auth/csrf', { method: 'GET', credentials: 'include' });
        const csrfJson = await csrfRes.json();
        csrfToken = csrfJson?.token;
      } catch (e) {
        console.warn('Failed to fetch CSRF token, proceeding with origin/referer checks only');
      }

      // Call the anonymous auth API endpoint instead of Supabase directly
      const response = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('Guest sign-in API response:', { status: response.status, result });

      if (!response.ok) {
        if (result.error === 'TURNSTILE_REQUIRED') {
          setError('Security verification required. Please complete the challenge below.');
          // Reset Turnstile to show it
          resetCaptcha();
        } else if (result.error === 'TURNSTILE_FAILED') {
          setError('Security verification failed. Please try again.');
          // Reset Turnstile for retry
          if (turnstileRef.current) {
            turnstileRef.current.reset();
          }
        } else if (result.error === 'RATE_LIMITED') {
          setError(`Too many attempts. Please wait ${result.retry_after || 60} seconds before trying again.`);
        } else {
          setError(result.error || 'Failed to continue as guest. Please try again.');
        }
        return;
      }

      // Success - redirect
      console.log('Guest sign-in redirect check:', { resultOk: result.ok, result });
      if (result.ok) {
        console.log('Guest sign-in successful, redirecting to /eatery');
        router.push('/eatery');
      } else {
        console.log('Guest sign-in failed, showing error');
        setError('Guest session creation failed. Please try again.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Guest sign in error:', err);
      setError('Failed to continue as guest. Please try again.');
    } finally {
      setGuestPending(false);
    }
  };

  const onAppleSignIn = async () => {
    setPending(true);
    setError(null);
    
    try {
      // Request server to set HttpOnly state cookie
      const stateRes = await fetch('/api/auth/oauth/state', { method: 'POST', credentials: 'include' });
      const stateJson = await stateRes.json();
      const oauthState = stateJson?.state as string | undefined;
      if (!oauthState) {
        setError('Unable to initialize sign in. Please try again.');
        return;
      }
      // Check if Apple OAuth is properly configured
      if (shouldRedirectToSetup()) {
        // Redirect to setup page if not configured
        router.push('/auth/apple-setup');
        return;
      }
      
      // Compute safe redirect URL using corrected validation
      const safeNext = validateRedirectUrl(redirectTo);
      
      // Add re-authentication parameters if this is a re-auth flow
      const callbackParams = new URLSearchParams({
        next: safeNext,
        provider: 'apple',
        state: oauthState
      });
      
      if (reauth && state) {
        callbackParams.set('reauth', 'true');
        callbackParams.set('link_state', state);
      }
      
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          scopes: 'email name',
          redirectTo: `${window.location.origin}/auth/callback?${callbackParams.toString()}`,
        },
      });

      if (error) {
        setError(mapAppleOAuthError(error.message));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Apple sign in error:', err);
      setError('Apple sign in failed');
    } finally {
      setPending(false);
    }
  };

  const onGoogleSignIn = async () => {
    setPending(true);
    setError(null);
    
    try {
      // Request server to set HttpOnly state cookie
      const stateRes = await fetch('/api/auth/oauth/state', { method: 'POST', credentials: 'include' });
      const stateJson = await stateRes.json();
      const oauthState = stateJson?.state as string | undefined;
      if (!oauthState) {
        setError('Unable to initialize sign in. Please try again.');
        return;
      }
      // Compute safe redirect URL using corrected validation
      const safeNext = validateRedirectUrl(redirectTo);
      
      // Add re-authentication parameters if this is a re-auth flow
      const callbackParams = new URLSearchParams({
        next: safeNext,
        provider: 'google',
        state: oauthState
      });
      
      if (reauth && state) {
        callbackParams.set('reauth', 'true');
        callbackParams.set('link_state', state);
      }
      
      // Use the correct callback URL that matches Supabase configuration
      const callbackUrl = `${window.location.origin}/auth/callback?${callbackParams.toString()}`;

      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        setError(`Google OAuth failed: ${error.message}`);
      } else {

      }
    } catch (err) {
      console.error('Google sign in error:', err);
      setError('Google sign in failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-jewgo-400 rounded-lg flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-white">g</span>
          </div>
        </div>

        {/* Title and Description */}
        <div>
          <h2 className="text-center text-2xl font-bold text-white">
            {reauth ? 'Re-authenticate to Link Accounts' : 'Sign in to JewGo'}
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-400">
            {reauth 
              ? `Please sign in with your ${provider} account to link your accounts securely.`
              : 'Access your account to manage favorites and more'
            }
          </p>
          {reauth && (
            <div className="mt-4 bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                🔗 <strong>Account Linking Required:</strong> We found multiple accounts with the same email address. 
                Please re-authenticate to securely link them together.
              </p>
            </div>
          )}
        </div>
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <p className="text-sm text-blue-300">Debug: {debugInfo}</p>
          </div>
        )}


        
        <form onSubmit={onEmailSignIn} className="space-y-6">
          <div className="space-y-4">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-neutral-600 placeholder-neutral-400 text-white bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:border-jewgo-400 focus:z-10 text-base"
                placeholder="Username, email or mobile number"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-neutral-600 placeholder-neutral-400 text-white bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:border-jewgo-400 focus:z-10 text-base"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-700 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={pending}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-jewgo-400 hover:bg-jewgo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jewgo-400 disabled:opacity-50 transition-colors"
            >
              {pending ? "Signing in..." : "Log in"}
            </button>
            
            <div className="text-left">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-neutral-800 text-neutral-400">Or continue with</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {/* Continue as Guest Button */}
            <button
              type="button"
              onClick={onGuestSignIn}
              disabled={guestPending || pending || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              className="w-full inline-flex justify-center py-2 px-4 border border-neutral-600 rounded-lg shadow-sm bg-neutral-700 text-sm font-medium text-neutral-300 hover:bg-neutral-600 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {guestPending ? "Continuing as Guest..." : "Continue as Guest"}
            </button>

            {/* Turnstile Widget - only show if configured */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
              <div className="mt-4 p-4 bg-neutral-700/50 rounded-lg border border-neutral-600">
                <div className="text-center mb-3">
                  <p className="text-sm text-neutral-300 mb-2">
                    Please complete the security check to continue as guest
                  </p>
                  {captchaState.error && (
                    <p className="text-red-400 text-xs">{captchaState.error}</p>
                  )}
                </div>
                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={handleCaptchaVerify}
                  onError={handleCaptchaError}
                  onExpired={handleCaptchaExpired}
                  theme="dark"
                  size="normal"
                  className="flex justify-center"
                />
              </div>
            ) : (
              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-300 text-center">
                  ⚠️ Guest sign-in temporarily unavailable
                </p>
              </div>
            )}

            {/* Apple Sign-In Button - positioned above Google per Apple prominence requirements */}
            <AppleSignInButton
              onClick={onAppleSignIn}
              disabled={pending}
              loading={pending}
              enabled={appleOAuthEnabled}
            />
            
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={pending}
              className="w-full inline-flex justify-center py-2 px-4 border border-neutral-600 rounded-lg shadow-sm bg-neutral-700 text-sm font-medium text-neutral-300 hover:bg-neutral-600 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="ml-2">Google</span>
            </button>
          </div>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push('/auth/signup')}
            className="w-full inline-flex justify-center py-2 px-4 border border-jewgo-400 rounded-lg shadow-sm bg-transparent text-sm font-medium text-jewgo-400 hover:bg-jewgo-400/10 transition-colors"
          >
            Create new account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jewgo-400 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    }>
      <SignInFormWithParams />
    </Suspense>
  );
}
