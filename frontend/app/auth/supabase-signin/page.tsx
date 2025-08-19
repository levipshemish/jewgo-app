"use client";

import { FormEvent, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

export default function SupabaseSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
        setPending(false);
        return;
      }
      
      if (data.user) {
        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify session is established
        const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`);
          setPending(false);
          return;
        }
        
        if (session && session.user) {
          // Session is established, redirect to test page first to verify
          window.location.href = "/test-supabase";
        } else {
          setError("Authentication successful but session not established. Please try again.");
        }
      } else {
        setError("Authentication failed. Please check your credentials.");
      }
          } catch {
        console.error('Sign in error occurred');
        setError("An unexpected error occurred. Please try again.");
    }
    
    setPending(false);
  };

  const onMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    
    try {
      // First, check if user already exists by attempting to sign in with a dummy password
      const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password: "dummy-password-for-check",
      });
      
      // If we get "Invalid login credentials", the user exists but password is wrong
      if (signInError && signInError.message.includes("Invalid login credentials")) {
        setError("An account with this email already exists. Please use email/password sign-in instead.");
        setPending(false);
        return;
      }
      
      // If sign in succeeds (unlikely with dummy password), user exists
      if (!signInError) {
        // Sign out immediately since we don't want to actually sign them in
        await supabaseBrowser.auth.signOut();
        setError("An account with this email already exists. Please use email/password sign-in instead.");
        setPending(false);
        return;
      }
      
      // If we get "User not found" or similar, user doesn't exist, proceed with magic link
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      
      setPending(false);
      if (error) {
        setError(error.message);
      } else {
        setError("Check your email for a magic link!");
      }
          } catch {
        setPending(false);
        setError("An unexpected error occurred. Please try again.");
    }
  };

  const onGoogle = async () => {
    setPending(true);
    setError(null);
    
    try {
      // console.log('Starting Google OAuth flow...');
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      
      if (error) {
        // console.error('Google OAuth error:', error);
        setError(`Google OAuth failed: ${error.message}`);
      } else {
        // console.log('Google OAuth initiated successfully');
      }
          } catch {
        // console.error('Unexpected error during Google OAuth');
        setError('Unexpected error occurred during Google OAuth');
    }
    
    setPending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to JewGo (Supabase)
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Testing Supabase authentication
          </p>
        </div>
        
        <form onSubmit={onEmailSignIn} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={pending}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {pending ? "Signing in..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={onMagicLink}
              disabled={pending}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {pending ? "Sending..." : "Send Magic Link"}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={onGoogle}
                disabled={pending}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
                <span className="ml-2">Sign in with Google</span>
              </button>
            </div>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <a href="/auth/supabase-signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign up
            </a>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            <a href="/auth/signin" className="font-medium text-gray-600 hover:text-gray-500">
              ← Back to NextAuth.js
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
