"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { signInAction, anonymousSignInAction } from "./actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase";

export default function SignInPage() {
  const [state, formAction] = useActionState(signInAction, { ok: false });
  const [anonymousState, anonymousFormAction] = useActionState(anonymousSignInAction, { ok: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    // Expose a global callback so Turnstile can write into our hidden input
    (window as any).onTurnstileSuccess = (token: string, origin?: string) => {
      // Validate origin to prevent token injection
      const expectedOrigin = 'https://challenges.cloudflare.com';
      if (origin && origin !== expectedOrigin) {
        console.warn('Turnstile token from unexpected origin:', origin);
        return;
      }
      
      const input = document.querySelector(
        'input[name="cf-turnstile-response"]'
      ) as HTMLInputElement | null;
      
      if (input && token && typeof token === 'string' && token.length > 10) {
        input.value = token;
      }
    };

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Handle successful authentication
  useEffect(() => {
    if (state.ok) {
      router.push("/eatery");
    }
  }, [state.ok, router]);

  useEffect(() => {
    if (anonymousState.ok) {
      router.push("/eatery");
    }
  }, [anonymousState.ok, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 rounded-2xl shadow-xl border border-neutral-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Sign in to JewGo</h1>
            <p className="text-neutral-400">Welcome back! Please sign in to continue.</p>
          </div>

          {/* Email/Password Form */}
          <form action={formAction} className="space-y-6">
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

            {/* Hidden field for the Turnstile token */}
            <input type="hidden" name="cf-turnstile-response" />

            {/* Turnstile widget */}
            <div className="flex justify-center">
              <div
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                data-callback="onTurnstileSuccess"
                data-action="signin"
                data-theme="dark"
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
          <form action={anonymousFormAction} className="mt-6">
            <input type="hidden" name="cf-turnstile-response" />
            <button
              type="submit"
              className="w-full inline-flex justify-center py-3 px-4 border border-neutral-600 rounded-lg shadow-sm bg-neutral-800 text-sm font-medium text-neutral-300 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Continue as Guest
            </button>

            {!anonymousState.ok && "message" in anonymousState && anonymousState.message && (
              <div className="text-red-400 text-sm text-center mt-2">{anonymousState.message}</div>
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
              Don't have an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
