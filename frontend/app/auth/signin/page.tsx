"use client";

// Trigger frontend rebuild to fix missing chunks - 2025-09-16
import React from 'react';
import { appLogger } from '@/lib/utils/logger';
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import { useEffect, useState, Suspense } from "react";
// import { useCallback } from "react"; // TODO: Implement callback functionality
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { postgresAuth, PostgresAuthError } from "@/lib/auth/postgres-auth";
import { useToast } from '@/components/ui/Toast';
import { handleAuthError } from '@/lib/auth/error-handler';
import ComingSoonModal from '@/components/ui/ComingSoonModal';

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [_isLoading, _setIsLoading] = useState(false); // TODO: Implement loading state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isEmailSigningIn, setIsEmailSigningIn] = useState(false);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
  const [csrfReady, setCsrfReady] = useState<boolean | null>(null);
  const [csrfMessage, setCsrfMessage] = useState<string | null>(null);
  const [showHeaderTooLargeHint, setShowHeaderTooLargeHint] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgradePassword, setUpgradePassword] = useState("");
  const [upgradeName, setUpgradeName] = useState("");
  const [upgradePending, setUpgradePending] = useState(false);
  const [showAppleComingSoon, setShowAppleComingSoon] = useState(false);
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || searchParams.get("callbackUrl") || "/eatery";
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // No auto-fill detection needed since magic link has separate email field

  // Check if reCAPTCHA is ready
  useEffect(() => {
    const checkRecaptchaReady = () => {
      if (typeof window !== 'undefined' && (window as any).grecaptcha && (window as any).grecaptcha.ready) {
        setIsRecaptchaReady(true);
        appLogger.info('reCAPTCHA is ready');
      } else {
        // Retry after a short delay, but give up after 10 seconds
        const maxAttempts = 100; // 10 seconds with 100ms intervals
        let attempts = 0;
        
        const retry = () => {
          attempts++;
          if (attempts >= maxAttempts) {
            appLogger.warn('reCAPTCHA failed to load after 10 seconds, proceeding without it');
            return;
          }
          
          if (typeof window !== 'undefined' && (window as any).grecaptcha && (window as any).grecaptcha.ready) {
            setIsRecaptchaReady(true);
            appLogger.info('reCAPTCHA is ready');
          } else {
            setTimeout(retry, 100);
          }
        };
        
        setTimeout(retry, 100);
      }
    };
    
    if (siteKey && siteKey !== 'your-recaptcha-site-key-here') {
      checkRecaptchaReady();
    }
  }, [siteKey]);

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Probe backend: if profile returns 200, redirect
        await postgresAuth.getProfile();
        router.push(redirectTo);
        return;
      } catch (err: any) {
        console.log('Auth check failed:', err);
        // Not authenticated; show form (handle all auth errors gracefully)
        setIsCheckingAuth(false);
        
        // Show cookie-size hint if 413 is encountered
        if (err instanceof PostgresAuthError && err.status === 413) {
          setShowHeaderTooLargeHint(true);
        } else if (typeof err?.message === 'string' && err.message.toLowerCase().includes('headers too large')) {
          setShowHeaderTooLargeHint(true);
        }
        
        // Log service availability issues but don't block the UI
        if (err instanceof PostgresAuthError && err.status === 503) {
          console.warn('Auth service temporarily unavailable, showing sign-in form');
        }
      } finally {
        // Ensure isCheckingAuth is always set to false after the check
        setIsCheckingAuth(false);
      }
    };
    checkAuthStatus();
  }, [router, redirectTo]);

  // Probe CSRF availability on mount
  useEffect(() => {
    let cancelled = false;
    let hasRun = false;
    
    (async () => {
      // Prevent multiple concurrent CSRF requests (React Strict Mode protection)
      if (hasRun) {
        return;
      }
      hasRun = true;
      
      try {
        await postgresAuth.getCsrf();
        if (!cancelled) {
          setCsrfReady(true);
          setCsrfMessage(null);
        }
      } catch (e: any) {
        const msg = e?.message || 'CSRF initialization failed';
        appLogger.error('CSRF init failed', { error: String(msg) });
        if (!cancelled) {
          setCsrfReady(false);
          setCsrfMessage('Authentication service is temporarily unavailable. Guest sessions are disabled.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogVisibleCookies = () => {
    try {
      const names = postgresAuth.getVisibleCookieNames();
      appLogger.info('Visible cookies on current origin', { cookies: names });
      // Also output to console for quick inspection
      // eslint-disable-next-line no-console
      console.log('[Auth] Visible cookie names:', names);
    } catch (e) {
      appLogger.warn('Failed to read visible cookies', { error: String(e) });
    }
  };

  // Handle form submission
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailSigningIn(true);
    setError(null);
    
    try {
      // Execute reCAPTCHA v3 for 'login' action if site key is present and properly configured
      let recaptchaToken = null;
      if (isRecaptchaReady && siteKey && siteKey !== 'your-recaptcha-site-key-here') {
        appLogger.info('Executing reCAPTCHA v3 for login action');
        
        try {
          // Use grecaptcha.ready() to ensure it's fully loaded, then execute
          const token = await new Promise<string>((resolve, reject) => {
            (window as any).grecaptcha.ready(async () => {
              try {
                const result = await (window as any).grecaptcha.execute(siteKey, { action: 'login' });
                resolve(result);
              } catch (recaptchaError) {
                reject(recaptchaError);
              }
            });
          });
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('reCAPTCHA timeout')), 5000)
          );
          
          const finalToken = await Promise.race([Promise.resolve(token), timeoutPromise]);
          
          if (finalToken) {
            appLogger.info('reCAPTCHA token obtained successfully');
            recaptchaToken = finalToken;
          } else {
            appLogger.warn('reCAPTCHA token was empty');
          }
        } catch (recaptchaError) {
          appLogger.error('reCAPTCHA execution failed', { error: String(recaptchaError) });
          // Non-fatal; continue without reCAPTCHA token
        }
      } else {
        appLogger.info('reCAPTCHA not configured or not available - proceeding without reCAPTCHA');
      }
      
      // Sign in with PostgreSQL auth (include reCAPTCHA token)
      await postgresAuth.login({ email, password, recaptcha_token: recaptchaToken || undefined });
      
      // Redirect on success
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo);
      } else {
        router.push(redirectTo);
      }
      
    } catch (signinError) {
      const authError = handleAuthError(signinError, 'signin', { email });
      setError(authError.message);
      showError(authError.message);
    } finally {
      setIsEmailSigningIn(false);
    }
  };

  // Magic link (passwordless) sign-in
  const [magicEmail, setMagicEmail] = useState(""); // Separate email for magic link
  const [magicStatus, setMagicStatus] = useState<string | null>(null);
  const [magicLinkCooldown, setMagicLinkCooldown] = useState<number>(0);
  
  // Rate limiting for magic link requests
  useEffect(() => {
    if (magicLinkCooldown > 0) {
      const timer = setTimeout(() => {
        setMagicLinkCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [magicLinkCooldown]);

  const handleMagicLinkSignIn = async () => {
    if (magicLinkCooldown > 0) return;

    try {
      setMagicStatus('sending');
      setError(null);

      // Debug: Log the email being used
      console.log('[Magic Link] Email being sent to:', magicEmail);
      appLogger.info('Magic link request', { email: magicEmail?.substring(0, 3) + '***' });

      // Basic email format validation
      if (!magicEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(magicEmail)) {
        setMagicStatus(null);
        setError('Please enter a valid email address to receive a magic link');
        showError('Please enter a valid email address to receive a magic link');
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
      if (!backendUrl) {
        setMagicStatus(null);
        setError('Missing backend configuration');
        return;
      }

      const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/api/v5/auth/magic/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail, returnTo: redirectTo }),
        credentials: 'include',
        mode: 'cors',
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.success === false) {
        const msg = data?.error || 'Failed to send magic link';
        setMagicStatus(null);
        setError(msg);
        showError(msg);
        return;
      }

      setMagicStatus('sent');
      showSuccess(`Magic link sent to ${magicEmail}! Check your email.`);
      setMagicLinkCooldown(60);
      
      // Clear the email field to prevent confusion
      // setEmail(''); // Commented out - user might want to try again
    } catch (magicError) {
      const authError = handleAuthError(magicError, 'magic_link_signin', { email: magicEmail });
      setError(authError.message);
      setMagicStatus(null);
      showError(authError.message);
    }
  };

  // Continue as Guest
  const handleGuestContinue = async () => {
    setError(null);
    try {
      // Ensure CSRF is available before attempting guest login
      try {
        await postgresAuth.getCsrf();
        setCsrfReady(true);
      } catch (e: any) {
        setCsrfReady(false);
        setCsrfMessage('Authentication service is temporarily unavailable. Guest sessions are disabled.');
        throw e;
      }
      await postgresAuth.guestLogin();
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo);
      } else {
        router.push(redirectTo);
      }
    } catch (e) {
      const authError = handleAuthError(e, 'guest_login');
      setError(authError.message);
      showError(authError.message);
    }
  };

  // Upgrade current guest session to full account
  const handleUpgradeGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUpgradePending(true);
    try {
      if (!upgradeEmail || !upgradePassword) {
        setError('Email and password are required to upgrade');
        return;
      }
      await postgresAuth.upgradeGuest({ email: upgradeEmail, password: upgradePassword, name: upgradeName || undefined });
      showSuccess('Your account was upgraded successfully! Redirecting…');
      // Briefly show success banner then redirect
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.assign(redirectTo);
        } else {
          router.push(redirectTo);
        }
      }, 1200);
    } catch (err: any) {
      const authError = handleAuthError(err, 'guest_upgrade', { email: upgradeEmail });
      setError(authError.message);
      showError(authError.message);
    } finally {
      setUpgradePending(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* reCAPTCHA Script */}
      {siteKey && siteKey !== 'your-recaptcha-site-key-here' && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          strategy="afterInteractive"
        />
      )}

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{" "}
              <Link
                href="/auth/signup"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                create a new account
              </Link>
            </p>
          </div>

          {/* 413 Hint Banner */}
          {showHeaderTooLargeHint && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded">
              <p className="text-sm">
                Having trouble loading your session? Your browser may be sending too many or oversized cookies to the API.
                Clear cookies for <strong>api.jewgo.app</strong> (and <strong>jewgo.app</strong> if needed), then try again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogVisibleCookies}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium border rounded bg-white hover:bg-gray-50 text-gray-800 border-gray-300"
                  title="Logs JS-visible cookie names to the console"
                >
                  Log visible cookie names
                </button>
                <span className="text-xs text-gray-600">(HttpOnly auth cookies won’t appear here)</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {/* CSRF/Service Banner */}
          {csrfReady === false && csrfMessage && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative">
              {csrfMessage}
            </div>
          )}

          {/* Success toast handled via useToast */}

          {/* Auto-fill warning removed - magic link now has separate email field */}

          {/* Success Message */}
          {magicStatus === 'sent' && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
              Check your email for a magic link to sign in!
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleEmailSignIn}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="off"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/auth/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isEmailSigningIn}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEmailSigningIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>

          {/* Alternative Sign-in Methods */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>


          <div className="mt-6 grid grid-cols-1 gap-3">
              {/* Google OAuth */}
              <button
                onClick={() => {
                  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
                  if (!backendUrl) {
                    setError('Missing backend configuration');
                    return;
                  }
                  const url = `${backendUrl.replace(/\/$/, '')}/api/v5/auth/google/start?returnTo=${encodeURIComponent(redirectTo)}`;
                  window.location.href = url;
                }}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="Sign in with Google"
              >
                Continue with Google
              </button>

              {/* Apple OAuth */}
              <button
                onClick={() => setShowAppleComingSoon(true)}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="Sign in with Apple"
              >
                Continue with Apple
              </button>

              {/* Magic Link Email Input */}
              <div className="mt-4">
                <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email for Magic Link (Passwordless Sign-in)
                </label>
                <input
                  id="magic-email"
                  name="magic-email"
                  type="email"
                  autoComplete="off"
                  placeholder="Enter email for magic link"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                />
              </div>

              {/* Magic Link Sign-in Button */}
              <button
                onClick={handleMagicLinkSignIn}
                disabled={magicLinkCooldown > 0 || magicStatus === 'sending' || !magicEmail.trim()}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {magicLinkCooldown > 0 ? (
                  `Wait ${magicLinkCooldown}s`
                ) : magicStatus === 'sending' ? (
                  'Sending magic link...'
                ) : !magicEmail.trim() ? (
                  'Enter email above for magic link'
                ) : (
                  `Send magic link to ${magicEmail}`
                )}
              </button>

              {/* Continue as Guest */}
              <button
                onClick={handleGuestContinue}
                disabled={csrfReady === false}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Start a temporary guest session"
              >
                {csrfReady === false ? 'Guest temporarily unavailable' : 'Continue as Guest'}
              </button>

              {/* Upgrade guest to full account */}
              <div className="border rounded-md p-3 bg-white">
                <button
                  type="button"
                  onClick={() => setShowUpgrade(v => !v)}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 text-left"
                  aria-expanded={showUpgrade}
                >
                  {showUpgrade ? 'Hide' : 'Upgrade my guest account'}
                </button>
                {showUpgrade && (
                  <form className="mt-3 space-y-3" onSubmit={handleUpgradeGuest}>
                    <input
                      type="email"
                      placeholder="Email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={upgradeEmail}
                      onChange={e => setUpgradeEmail(e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password (min 8 chars)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={upgradePassword}
                      onChange={e => setUpgradePassword(e.target.value)}
                      required
                    />
                    {upgradePassword && (
                      <div className="mt-2">
                        <PasswordStrengthIndicator password={upgradePassword} />
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Full name (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={upgradeName}
                      onChange={e => setUpgradeName(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={upgradePending}
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {upgradePending ? 'Upgrading…' : 'Upgrade account'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Modal for Apple Sign-In */}
      <ComingSoonModal
        isOpen={showAppleComingSoon}
        onClose={() => setShowAppleComingSoon(false)}
        title="Apple Sign-In Coming Soon"
        description="We're currently configuring Apple Sign-In authentication. This feature will be available soon!"
        feature="Apple Sign-In"
      />
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}
