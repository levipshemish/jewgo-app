"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/password-validation";
import { validateRedirectUrl, mapAppleOAuthError } from "@/lib/utils/auth-utils";
import { AppleSignInButton } from "@/components/ui/AppleSignInButton";
import { getClientConfig } from "@/lib/config/client-config";

// Separate component to handle search params with proper Suspense boundary
function SignUpFormWithParams() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || searchParams.get('redirectTo') || '/profile/settings';
  
  return <SignUpForm redirectTo={next} />;
}

function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Initialize with the correct value to avoid flash
  const [appleOAuthEnabled, setAppleOAuthEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const config = getClientConfig();
      return config.appleOAuthEnabled;
    }
    return false;
  });

  // Check Apple OAuth configuration on component mount
  useEffect(() => {
    const config = getClientConfig();
    setAppleOAuthEnabled(config.appleOAuthEnabled);
  }, []);

  const onEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setPending(false);
      return;
    }

    // Use shared password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(", "));
      setPending(false);
      return;
    }
    
    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setError(error.message);
        setPending(false);
        return;
      }
      
      if (data.user) {
        setSuccess("Account created successfully! Please check your email to verify your account.");
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setError("An unexpected error occurred. Please try again.");
    }
    
    setPending(false);
  };

  const onAppleSignUp = async () => {
    setPending(true);
    setError(null);
    
    try {
      // Compute safe redirect URL using corrected validation
      const safeNext = validateRedirectUrl(redirectTo);
      
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          scopes: 'email name',
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}&provider=apple`,
        },
      });

      if (error) {
        setError(mapAppleOAuthError(error.message));
      }
    } catch (err) {
      console.error('Apple sign up error:', err);
      setError('Apple sign up failed');
    } finally {
      setPending(false);
    }
  };

  const onGoogleSignUp = async () => {
    setPending(true);
    setError(null);
    
    try {
      // Compute safe redirect URL using corrected validation
      const safeNext = validateRedirectUrl(redirectTo);
      
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}&provider=google`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      
      if (error) {
        setError(`Google OAuth failed: ${error.message}`);
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    setPending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join JewGo to save favorites and discover kosher restaurants
          </p>
        </div>
        
        <form onSubmit={onEmailSignUp} className="mt-8 space-y-6">
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
                autoComplete="new-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={pending}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {pending ? "Creating account..." : "Create Account"}
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

            <div className="mt-6 space-y-3">
              {/* Apple Sign-In Button - positioned above Google per Apple prominence requirements */}
              <AppleSignInButton
                onClick={onAppleSignUp}
                disabled={pending}
                loading={pending}
                enabled={appleOAuthEnabled}
              />
              
              <button
                type="button"
                onClick={onGoogleSignUp}
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
                <span className="ml-2">Google</span>
              </button>
            </div>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            <Link href="/" className="font-medium text-gray-600 hover:text-gray-500">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpFormWithParams />
    </Suspense>
  );
}
