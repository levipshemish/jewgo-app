"use client";

import React from 'react';
import { appLogger } from '@/lib/utils/logger';
import { useEffect, useState, Suspense } from "react";
// import { useCallback } from "react"; // TODO: Implement callback functionality
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { postgresAuth } from "@/lib/auth/postgres-auth";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || searchParams.get("callbackUrl") || "/eatery";
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

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

  // Check if user is already authenticated and redirect to eatery
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check if user is authenticated via PostgreSQL auth
        if (postgresAuth.isAuthenticated()) {
          // User is authenticated, redirect to intended destination
          router.push(redirectTo);
          return;
        }
        
        // User is not authenticated, show sign-in form
        setIsCheckingAuth(false);
      } catch (authError) {
        appLogger.error('Error checking auth status', { error: String(authError) });
        // On error, show sign-in form
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [router, redirectTo]);

  // Probe CSRF availability on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
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

  // Handle form submission
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailSigningIn(true);
    setError(null);
    
    try {
      // Execute reCAPTCHA v3 for 'login' action if site key is present and properly configured
      let _recaptchaToken = null; // TODO: Use recaptcha token
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
            _recaptchaToken = finalToken;
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
      
      // Sign in with PostgreSQL auth (include optional reCAPTCHA)
      await postgresAuth.login({ email, password, recaptcha_token: _recaptchaToken || undefined });
      
      // Redirect on success
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo);
      } else {
        router.push(redirectTo);
      }
      
    } catch (signinError) {
      appLogger.error('Sign in failed', { error: String(signinError) });
      setError(signinError instanceof Error ? signinError.message : 'Sign in failed');
    } finally {
      setIsEmailSigningIn(false);
    }
  };

  // Magic link (passwordless) sign-in
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
  }, [magicLinkCooldown]);

  const handleMagicLinkSignIn = async () => {
    if (magicLinkCooldown > 0) return;
    
    try {
      setMagicStatus('sending');
      setError(null);
      
      // PostgreSQL auth doesn't support magic links by default
      // This could be implemented as a password reset flow
      setError('Magic link sign-in not supported in PostgreSQL auth system');
      setMagicStatus(null);
      
    } catch (magicError) {
      appLogger.error('Magic link sign-in failed', { error: String(magicError) });
      setError('Failed to send magic link');
      setMagicStatus(null);
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
      appLogger.error('Guest login failed', { error: String(e) });
      setError('Failed to start a guest session');
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
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
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
              {/* Magic Link Sign-in */}
              <button
                onClick={handleMagicLinkSignIn}
                disabled={magicLinkCooldown > 0}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {magicLinkCooldown > 0 ? (
                  `Wait ${magicLinkCooldown}s`
                ) : (
                  "Sign in with magic link"
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
            </div>
          </div>
        </div>
      </div>
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
