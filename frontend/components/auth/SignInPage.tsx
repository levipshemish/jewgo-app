"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useState, Suspense, useEffect } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import { validateRedirectUrl, mapAppleOAuthError } from "@/lib/utils/auth-utils";

// Separate component to handle search params with proper Suspense boundary
function SignInFormWithParams() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || searchParams.get('redirectTo') || '/eatery';
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
  const router = useRouter();

  const onEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      // User authenticated successfully - redirect to location access first
      router.push('/location-access');
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Sign in failed');
    } finally {
      setPending(false);
    }
  };

  const onGuestSignIn = async () => {
    setGuestPending(true);
    setError(null);
    
    try {
      // Single-flight protection
      if (guestPending) {
        return;
      }
      
      const response = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'RATE_LIMITED') {
          setError(`Too many attempts. Please try again later.`);
        } else if (result.error === 'ANON_SIGNIN_UNSUPPORTED') {
          setError('Guest access is currently unavailable.');
        } else {
          setError('Failed to continue as guest. Please try again.');
        }
        return;
      }

      // Get session and redirect
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (session) {
        router.push('/location-access');
      } else {
        setError('Guest session creation failed. Please try again.');
      }
    } catch (err) {
      console.error('Guest sign in error:', err);
      setError('Failed to continue as guest. Please try again.');
    } finally {
      setGuestPending(false);
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

            <div className="mt-6 space-y-3">
              {/* Continue as Guest Button */}
              <button
                type="button"
                onClick={onGuestSignIn}
                disabled={guestPending || pending}
                className="w-full inline-flex justify-center py-2 px-4 border border-neutral-600 rounded-lg shadow-sm bg-neutral-700 text-sm font-medium text-neutral-300 hover:bg-neutral-600 disabled:opacity-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {guestPending ? "Continuing as Guest..." : "Continue as Guest"}
              </button>
            </div>
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

export default function SignInPage() {
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
