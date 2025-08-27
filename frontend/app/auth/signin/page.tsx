"use client";

import { appLogger } from '@/lib/utils/logger';
import { useEffect, useState, Suspense, useCallback, useActionState } from "react";
import Script from "next/script";
import { signInAction } from "./actions";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
// Use SSR-aware browser client so PKCE + cookies work with server callback
import { supabaseClient } from "@/lib/supabase/client-secure";

function SignInForm() {
  const [state, formAction] = useActionState(signInAction, { ok: false, message: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [anonError, setAnonError] = useState<string | null>(null);
  const [anonLoading, setAnonLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isEmailSigningIn, setIsEmailSigningIn] = useState(false);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
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
        const response = await fetch('/api/auth/sync-user', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          if (userData.user) {
            // Check if user is a guest user (no email, provider unknown)
            const isGuest = !userData.user.email && userData.user.provider === 'unknown';
            
            if (isGuest) {
              // Guest users should be allowed to sign in to upgrade their account
              setIsCheckingAuth(false);
              return;
            } else {
              // User is authenticated with email, redirect to intended destination
              router.push(redirectTo);
              return;
            }
          }
        }
        
        // User is not authenticated, show sign-in form
        setIsCheckingAuth(false);
      } catch (error) {
        appLogger.error('Error checking auth status', { error: String(error) });
        // On error, show sign-in form
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [router, redirectTo]);

  // Handle successful authentication
  useEffect(() => {
    if (state.ok) {
      // Use full navigation so auth cookies are applied before middleware checks
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo);
      } else {
        router.push(redirectTo);
      }
    } else if (state.message) {
      // Reset loading state when form action completes (success or error)
      setIsEmailSigningIn(false);
    }
  }, [state.ok, state.message, router, redirectTo]);

  // Anonymous success handled inline in handler

  // Handle form submission
  const handleEmailSignIn = async (formData: FormData) => {
    setIsEmailSigningIn(true);
    try {
      // Execute reCAPTCHA v3 for 'login' action if site key is present and properly configured
      if (isRecaptchaReady && siteKey && siteKey !== 'your-recaptcha-site-key-here') {
        appLogger.info('Executing reCAPTCHA v3 for login action');
        
        try {
          // Use grecaptcha.ready() to ensure it's fully loaded, then execute
          const token = await new Promise<string>((resolve, reject) => {
            (window as any).grecaptcha.ready(async () => {
              try {
                const result = await (window as any).grecaptcha.execute(siteKey, { action: 'login' });
                resolve(result);
              } catch (error) {
                reject(error);
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
            formData.set('recaptchaToken', finalToken);
            formData.set('recaptchaAction', 'login');
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
    } catch (error) {
      appLogger.error('Form submission error', { error: String(error) });
      // Non-fatal; continue without reCAPTCHA token
    }
    
    // Always call formAction, even if reCAPTCHA fails
    appLogger.info('Submitting form with or without reCAPTCHA token');
    formAction(formData);
  };

  // Start OAuth flow (Google/Apple) via Supabase
  const handleOAuthSignIn = useCallback(async (provider: 'google' | 'apple') => {
    try {
      const nextUrl = redirectTo || '/eatery';
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

      await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
    } catch (_err) {
      // surface basic error via URL
      router.push(`/auth/signin?error=oauth_init_failed&provider=${provider}`);
    }
  }, [router, redirectTo]);

  // Magic link (passwordless) sign-in via Supabase
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

  const handleSendMagicLink = useCallback(async () => {
    setMagicStatus(null);
    
    // Check rate limiting
    if (magicLinkCooldown > 0) {
      setMagicStatus(`Please wait ${magicLinkCooldown} seconds before requesting another magic link.`);
      return;
    }
    
    if (!email) {
      setMagicStatus('Please enter your email first.');
      return;
    }
    
    // Set cooldown (60 seconds)
    setMagicLinkCooldown(60);
    
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const nextUrl = redirectTo || '/eatery';
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });
      
      if (error) {
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          setMagicStatus('Too many requests. Please wait 60 seconds before trying again.');
          setMagicLinkCooldown(60);
        } else {
          setMagicStatus(error.message || 'Failed to send magic link.');
          // Reset cooldown on non-rate-limit errors
          setMagicLinkCooldown(0);
        }
        return;
      }
      
      setMagicStatus('Check your email for a sign-in link.');
    } catch (_err) {
      setMagicStatus('Failed to send magic link.');
      // Reset cooldown on errors
      setMagicLinkCooldown(0);
    }
  }, [email, redirectTo, magicLinkCooldown]);

  const handleAnonymousSignIn = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAnonError(null);
    setAnonLoading(true);
    
    try {
      // Get CSRF token first
      const csrfRes = await fetch('/api/auth/csrf', { 
        method: 'GET', 
        credentials: 'include' 
      });
      const csrfJson = await csrfRes.json();
      const csrfToken = csrfJson?.token;

      const res = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const code = json?.error || 'ANON_SIGNIN_FAILED';
        switch (code) {
          case 'RATE_LIMITED':
            setAnonError('Too many attempts. Please try again later.');
            break;
          case 'ANON_SIGNIN_UNSUPPORTED':
            setAnonError('Guest sign-in is not available right now.');
            break;
          default:
            setAnonError('Failed to continue as guest');
        }
        setAnonLoading(false);
        return;
      }
      router.push(redirectTo);
    } catch (_err) {
      setAnonError('Guest sign-in failed. Please try again.');
      setAnonLoading(false);
    }
  }, [router, redirectTo]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-800 p-6">
        <div className="w-full max-w-md">
          <div className="bg-neutral-900 rounded-2xl shadow-xl border border-neutral-700 p-8">
            <div className="text-center">
              <div className="mb-6">
                <img src="/logo.svg" alt="JewGo" className="mx-auto w-full h-20 rounded-xl object-cover" />
              </div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jewgo-400 mx-auto mb-4"></div>
              <p className="text-neutral-400">Checking authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 p-6">
      {siteKey && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          strategy="afterInteractive"
        />
      )}
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 rounded-2xl shadow-xl border border-neutral-700 p-8">
          <div className="text-center mb-6">
            <div className="mb-6">
              <img src="/logo.svg" alt="JewGo" className="mx-auto w-full h-20 rounded-xl object-cover" />
            </div>
            <p className="text-neutral-400">Welcome back! Please sign in to continue.</p>
          </div>

          {/* Email/Password Form */}
          <form action={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-5 py-3.5 bg-neutral-800 border border-neutral-600 rounded-full text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-5 py-3.5 bg-neutral-800 border border-neutral-600 rounded-full text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>



            <button
              type="submit"
              disabled={isEmailSigningIn}
              className="w-full bg-jewgo-400 text-white py-3.5 px-6 rounded-full font-medium hover:bg-jewgo-500 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors disabled:opacity-50"
            >
              {isEmailSigningIn ? 'Signing In...' : 'Sign In'}
            </button>

            {!state.ok && "message" in state && state.message && (
              <div className="text-red-400 text-sm text-center">{state.message}</div>
            )}
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-neutral-900 text-neutral-400">Or continue with</span>
              </div>
            </div>
          </div>

          {/* OAuth Providers */}
          <div className="mt-4 grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              className="w-full inline-flex items-center justify-center py-3.5 px-6 border border-neutral-600 rounded-full bg-neutral-800 text-sm font-medium text-white hover:bg-neutral-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors"
              aria-label="Continue with Google"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3" aria-hidden="true">
                <path fill="#EA4335" d="M533.5 278.4c0-18.5-1.7-36.3-4.8-53.6H272v101.5h147c-6.3 34-25.1 62.8-53.6 82v68.2h86.6c50.6-46.6 81.5-115.4 81.5-198.1z"/>
                <path fill="#34A853" d="M272 544.3c72.8 0 134-24.1 178.7-65.7l-86.6-68.2c-24.1 16.2-55 25.9-92.1 25.9-70.8 0-130.8-47.8-152.3-112.1H30.7v70.5C75.1 490.3 167.4 544.3 272 544.3z"/>
                <path fill="#4A90E2" d="M119.7 324.1c-5.5-16.2-8.7-33.5-8.7-51.2s3.2-35 8.7-51.2V151H30.7C11 189.6 0 232.1 0 272.9s11 83.3 30.7 121.9l89-70.7z"/>
                <path fill="#FBBC05" d="M272 107.7c39.6 0 75.2 13.6 103.2 40.4l77.4-77.4C406 25.3 344.8 0 272 0 167.4 0 75.1 54 30.7 151l89 70.7C141.2 155.5 201.2 107.7 272 107.7z"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('apple')}
              className="w-full inline-flex items-center justify-center py-3.5 px-6 border border-neutral-600 rounded-full bg-neutral-800 text-sm font-medium text-white hover:bg-neutral-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors"
              aria-label="Continue with Apple"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16.365 1.43c0 1.14-.414 1.947-1.242 2.535-.828.59-1.756.95-2.785 1.09-.048-.174-.072-.365-.072-.575 0-1.094.377-1.973 1.131-2.642.757-.67 1.708-1.008 2.954-1.008.004.2.014.4.014.6zM21.6 17.42c-.34.786-.75 1.49-1.23 2.113-.57.742-1.04 1.254-1.41 1.533-.565.52-1.172.79-1.82.81-.465.01-1.026-.13-1.684-.42-.658-.29-1.264-.435-1.82-.435-.58 0-1.203.145-1.87.435-.666.29-1.206.438-1.62.446-.62.012-1.236-.26-1.85-.82-.39-.32-.875-.85-1.453-1.59-.623-.8-1.136-1.723-1.54-2.77-.43-1.11-.645-2.184-.645-3.22 0-1.19.257-2.22.77-3.09.402-.7.94-1.25 1.612-1.66.672-.41 1.398-.62 2.177-.63.51-.01 1.176.16 1.996.51.818.35 1.343.53 1.57.53.17 0 .73-.206 1.686-.62.904-.39 1.668-.55 2.29-.48 1.69.14 2.96.81 3.81 2.01-1.51.91-2.26 2.19-2.25 3.83.01 1.28.47 2.35 1.38 3.2.41.38.86.67 1.35.86-.11.32-.23.63-.37.93z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Anonymous Sign In */}
          <form onSubmit={handleAnonymousSignIn} className="mt-4">
            <button
              type="submit"
              disabled={anonLoading}
              className="w-full inline-flex justify-center py-3.5 px-6 border border-neutral-600 rounded-full shadow-sm bg-neutral-800 text-sm font-medium text-white hover:bg-neutral-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors disabled:opacity-50 disabled:text-neutral-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {anonLoading ? 'Continuing...' : 'Continue as Guest'}
            </button>

            {anonError && (
              <div className="text-red-400 text-sm text-center mt-2">{anonError}</div>
            )}
          </form>

          {/* Magic Link */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={magicLinkCooldown > 0}
              className="w-full inline-flex justify-center py-3.5 px-6 border border-neutral-600 rounded-full shadow-sm bg-neutral-800 text-sm font-medium text-white hover:bg-neutral-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors disabled:opacity-50 disabled:text-neutral-500"
            >
              {magicLinkCooldown > 0 
                ? `Wait ${magicLinkCooldown}s before retry` 
                : 'Send me a magic link'
              }
            </button>
            {magicStatus && (
              <div className={`text-sm text-center mt-2 ${magicStatus.includes('Check') ? 'text-green-400' : 'text-red-400'}`}>
                {magicStatus}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2.5 text-sm">
            <Link href="/auth/forgot-password" className="text-neutral-400 hover:text-neutral-300 transition-colors">
              Forgot password?
            </Link>
            <span className="text-neutral-600">•</span>
            <Link href="/auth/signup" className="text-jewgo-400 hover:text-jewgo-300 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  
  return (
    <>
      {siteKey && siteKey !== 'your-recaptcha-site-key-here' && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          strategy="afterInteractive"
          onLoad={() => {
            appLogger.info('reCAPTCHA script loaded successfully');
          }}
          onError={(error) => {
            appLogger.error('reCAPTCHA script failed to load', { error: String(error) });
          }}
        />
      )}
      <Suspense fallback={<div>Loading...</div>}>
        <SignInForm />
      </Suspense>
    </>
  );
}
/* eslint-disable no-console */
