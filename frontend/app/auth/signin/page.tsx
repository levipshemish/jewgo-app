"use client";

// Trigger frontend rebuild to fix missing chunks - 2025-09-16
import React from 'react';
import { appLogger } from '@/lib/utils/logger';
import { useEffect, useState, Suspense } from "react";
// PasswordStrengthIndicator removed from this page (no upgrade form)
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { postgresAuth, PostgresAuthError } from "@/lib/auth/postgres-auth";
import { validateRedirectUrl } from '@/lib/utils/auth-utils';
import { useToast } from '@/components/ui/Toast';
import { handleAuthError } from '@/lib/auth/error-handler';
import ComingSoonModal from '@/components/ui/ComingSoonModal';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/ui/Logo';
import Image from 'next/image';

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [_isLoading, _setIsLoading] = useState(false); // TODO: Implement loading state
  const [isCheckingAuth, _setIsCheckingAuth] = useState(false);
  const [isEmailSigningIn, setIsEmailSigningIn] = useState(false);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
  const [csrfReady, setCsrfReady] = useState<boolean | null>(null);
  const [csrfMessage, setCsrfMessage] = useState<string | null>(null);
  const [showHeaderTooLargeHint, setShowHeaderTooLargeHint] = useState(false);
  // Removed upgrade guest account UI/state per design request
  const [showAppleComingSoon, setShowAppleComingSoon] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicStatus, setMagicStatus] = useState<string | null>(null);
  const [magicLinkCooldown, setMagicLinkCooldown] = useState<number>(0);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);

  const { showSuccess: _showSuccess, showError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRedirect = '/eatery';
  const rawRedirectTarget = searchParams.get("returnTo") || searchParams.get("redirectTo") || searchParams.get("callbackUrl");
  const redirectTo = rawRedirectTarget ? validateRedirectUrl(rawRedirectTarget) : defaultRedirect;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Check if reCAPTCHA is ready
  useEffect(() => {
    const checkRecaptchaReady = () => {
      if (typeof window !== 'undefined' && (window as any).grecaptcha && (window as any).grecaptcha.ready) {
        setIsRecaptchaReady(true);
        appLogger.info('reCAPTCHA is ready');
      } else {
        const retry = () => {
          if (typeof window === 'undefined') {
            appLogger.info('reCAPTCHA check: Not in browser environment');
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

  // Check if user is already authenticated and redirect (non-blocking)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Quick check if auth is available
        if (!postgresAuth.isAuthenticated()) {
          // No auth token, stay on signin form
          return;
        }
        
        // Add timeout to prevent hanging indefinitely
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth check timeout')), 3000);
        });
        
        // Probe backend: if profile returns 200, redirect
        await Promise.race([postgresAuth.getProfile(), timeoutPromise]);
        router.push(redirectTo);
        return;
      } catch (err: any) {
        console.log('Auth check failed:', err);
        // Not authenticated; stay on form (handle all auth errors gracefully)
        
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
      }
    };
    
    // Run auth check in background, don't block the form
    checkAuthStatus();
  }, [redirectTo, router]);

  // CSRF check
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await postgresAuth.getCsrf();
        if (!cancelled) {
          setCsrfReady(true);
        }
      } catch (err: any) {
        if (cancelled) return;
        
        appLogger.error('CSRF preload failed', { error: String(err) });
        setCsrfReady(false);
        
        if (err instanceof PostgresAuthError && err.status === 503) {
          setCsrfMessage('Authentication service is temporarily unavailable. Guest access is disabled.');
        } else {
          setCsrfMessage('Authentication service is having issues. Please try again in a moment.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleLogVisibleCookies = () => {
    try {
      const names = postgresAuth.getVisibleCookieNames();
      console.log('Visible cookie names (non-HttpOnly):', names);
      console.log('HttpOnly cookies (access_token, refresh_token) cannot be read from JavaScript.');
    } catch (err) {
      console.error('Error getting cookie names:', err);
    }
  };

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

  // Focus magic link email input when modal opens
  useEffect(() => {
    if (showMagicLinkModal) {
      const timer = setTimeout(() => {
        const input = document.getElementById('modal-magic-email');
        if (input) input.focus();
      }, 150); // Small delay for modal animation
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showMagicLinkModal]);

  // Magic link cooldown timer
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
    
    setMagicStatus('sending');
    try {
      if (!magicEmail) {
        setError('Please enter your email address.');
        setMagicStatus(null);
        return;
      }

      if (!magicEmail.includes('@')) {
        setError('Please enter a valid email address.');
        setMagicStatus(null);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
      const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/api/v5/auth/magic/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: magicEmail, returnTo: redirectTo }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with status ${resp.status}`);
      }

      setMagicStatus('sent');
      setMagicLinkCooldown(60); // 60-second cooldown
      setError(null);
      
      setTimeout(() => {
        setMagicStatus(null);
      }, 10000);

    } catch (magicError) {
      const authError = handleAuthError(magicError, 'magic_link_signin', { email: magicEmail });
      setError(authError.message);
      setMagicStatus(null);
    }
  };

  const handleGuestContinue = async () => {
    try {
      await postgresAuth.guestLogin();
      
      // Redirect on success
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

  // Upgrade guest flow removed per design request

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
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

      <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Sign in to your account</CardTitle>
              <CardDescription>
                Or{' '}
                <Link href="/auth/signup" className="text-blue-600 hover:text-blue-500">create a new account</Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 413 Hint Banner */}
              {showHeaderTooLargeHint && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertDescription>
                    Having trouble loading your session? Your browser may be sending too many or oversized cookies to the API. Clear cookies for <strong>api.jewgo.app</strong> (and <strong>jewgo.app</strong> if needed), then try again.
                    <div className="mt-2 flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleLogVisibleCookies} title="Logs JS-visible cookie names to the console">
                        Log visible cookie names
                      </Button>
                      <span className="text-xs text-gray-600">(HttpOnly auth cookies won&apos;t appear here)</span>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Display */}
              {error && (
                <Alert className="border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* CSRF/Service Banner */}
              {csrfReady === false && csrfMessage && (
                <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                  <AlertDescription>{csrfMessage}</AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {magicStatus === 'sent' && (
                <Alert className="border-green-200 bg-green-50 text-green-700">
                  <AlertDescription>Check your email for a magic link to sign in!</AlertDescription>
                </Alert>
              )}

              <form className="mt-2 space-y-4" onSubmit={handleEmailSignIn}>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">Email address</label>
                    <Input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="off"
                      required
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                      className="pr-20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-7 h-8 px-3 text-gray-400 hover:text-gray-600 rounded-full"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-500">
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <div>
                  <Button type="submit" disabled={isEmailSigningIn} className="w-full rounded-full">
                    {isEmailSigningIn ? 'Signing in...' : 'Sign in'}
                  </Button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
                    if (!backendUrl) {
                      showError('Backend URL not configured');
                      return;
                    }
                    const url = `${backendUrl.replace(/\/$/, '')}/api/v5/auth/google/start?returnTo=${encodeURIComponent(redirectTo)}`;
                    window.location.href = url;
                  }}
                  className="w-full rounded-full"
                >
                  <span className="inline-flex items-center gap-2">
                    <Image src="/providers/google.svg" alt="Google" width={18} height={18} />
                    Continue with Google
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAppleComingSoon(true)}
                  className="w-full rounded-full"
                >
                  <span className="inline-flex items-center gap-2">
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-black">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Continue with Apple
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMagicLinkModal(true)}
                  className="w-full rounded-full"
                >
                  Send magic link
                </Button>

                <Button
                  type="button"
                  // Make guest button primary color like main actions
                  onClick={handleGuestContinue}
                  disabled={csrfReady === false}
                  className="w-full rounded-full"
                >
                  {csrfReady === false ? 'Guest temporarily unavailable' : 'Continue as Guest'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Magic Link Modal */}
      {showMagicLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sign in with magic link</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMagicLinkModal(false);
                  setMagicEmail('');
                  setMagicStatus(null);
                }}
                className="text-gray-400 hover:text-gray-600 rounded-full"
              >
                ×
              </Button>
            </div>

            <div className="mb-4">
              <label htmlFor="modal-magic-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <Input
                id="modal-magic-email"
                type="email"
                placeholder="Enter your email"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && magicEmail) {
                    handleMagicLinkSignIn();
                    setShowMagicLinkModal(false);
                    setMagicEmail('');
                    setMagicStatus(null);
                  }
                }}
                disabled={magicStatus === 'sending'}
              />
              {magicStatus === 'sending' && (
                <p className="mt-2 text-sm text-blue-600">Sending magic link...</p>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                onClick={() => {
                  handleMagicLinkSignIn();
                }}
                disabled={!magicEmail || magicStatus === 'sending' || magicLinkCooldown > 0}
                className="flex-1 rounded-full"
              >
                {magicLinkCooldown > 0
                  ? `Wait ${magicLinkCooldown}s`
                  : magicStatus === 'sending'
                  ? 'Sending...'
                  : 'Send magic link'
                }
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMagicLinkModal(false);
                  setMagicEmail('');
                  setMagicStatus(null);
                }}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

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
