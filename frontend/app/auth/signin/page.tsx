"use client";

import { useEffect, useState, Suspense, useCallback, useActionState } from "react";
import { signInAction } from "./actions";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";

function SignInForm() {
  const [state, formAction] = useActionState(signInAction, { ok: false, message: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [anonymousTurnstileToken, setAnonymousTurnstileToken] = useState("");
  const [anonError, setAnonError] = useState<string | null>(null);
  const [anonLoading, setAnonLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/eatery";

  // Handle successful authentication
  useEffect(() => {
    if (state.ok) {
      // Use full navigation so auth cookies are applied before middleware checks
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo);
      } else {
        router.push(redirectTo);
      }
    }
  }, [state.ok, router, redirectTo]);

  // Anonymous success handled inline in handler

  // Handle Turnstile verification for email signin
  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
  };

  // Handle Turnstile verification for anonymous signin
  const handleAnonymousTurnstileVerify = (token: string) => {
    setAnonymousTurnstileToken(token);
  };

  // Handle form submission
  const handleEmailSignIn = (formData: FormData) => {
    // Add the Turnstile token to the form data
    if (turnstileToken) {
      formData.append('cf-turnstile-response', turnstileToken);
    }
    formAction(formData);
  };

  const handleAnonymousSignIn = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAnonError(null);
    setAnonLoading(true);
    
    // Debug logging
    // console.log('Anonymous sign-in attempt with token:', anonymousTurnstileToken ? 'Present' : 'Missing');
    
    try {
      const res = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ turnstileToken: anonymousTurnstileToken || null })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const code = json?.error || 'ANON_SIGNIN_FAILED';
        switch (code) {
          case 'TURNSTILE_REQUIRED':
          case 'TURNSTILE_INVALID':
            setAnonError('Security check failed. Please try again.');
            break;
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
  }, [router, redirectTo, anonymousTurnstileToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 rounded-2xl shadow-xl border border-neutral-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Sign in to JewGo</h1>
            <p className="text-neutral-400">Welcome back! Please sign in to continue.</p>
          </div>

          {/* Email/Password Form */}
          <form action={handleEmailSignIn} className="space-y-6">
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
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:border-transparent"
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
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            {/* Turnstile widget */}
            <div className="flex justify-center">
              <TurnstileWidget
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                onVerify={handleTurnstileVerify}
                action="signin"
                theme="dark"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-jewgo-400 text-white py-3 px-4 rounded-lg font-medium hover:bg-jewgo-500 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors"
            >
              Sign In
            </button>

            {!state.ok && "message" in state && state.message && (
              <div className="text-red-400 text-sm text-center">{state.message}</div>
            )}
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-neutral-900 text-neutral-400">Or continue with</span>
              </div>
            </div>
          </div>

          {/* Anonymous Sign In */}
          <form onSubmit={handleAnonymousSignIn} className="mt-6">
            {/* Turnstile widget for anonymous signin */}
            <div className="flex justify-center mb-4">
              <TurnstileWidget
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                onVerify={handleAnonymousTurnstileVerify}
                action="anonymous_signin"
                theme="dark"
              />
            </div>
            <button
              type="submit"
              disabled={anonLoading}
              className="w-full inline-flex justify-center py-3 px-4 border border-neutral-600 rounded-lg shadow-sm bg-neutral-800 text-sm font-medium text-neutral-300 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors disabled:opacity-50"
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

          <div className="mt-6 text-center">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/auth/signup"
              className="text-sm text-jewgo-400 hover:text-jewgo-300 transition-colors"
            >
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}
