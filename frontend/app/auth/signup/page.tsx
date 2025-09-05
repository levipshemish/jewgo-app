"use client";

import { appLogger } from '@/lib/utils/logger';
import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
// import { useEffect } from "react"; // TODO: Implement useEffect functionality
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { postgresAuth } from "@/lib/auth/postgres-auth";
import { validatePassword } from "@/lib/utils/password-validation";

// Separate component to handle search params with proper Suspense boundary
function SignUpFormWithParams() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || searchParams.get('redirectTo') || '/profile/settings';
  
  return <SignUpForm redirectTo={next} />;
}

function SignUpForm({ redirectTo: _redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

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

    // Execute reCAPTCHA v3 for 'signup' action if site key is present and properly configured
    let recaptchaToken = null;
    try {
      if (typeof window !== 'undefined' && (window as any).grecaptcha && siteKey && siteKey !== 'your-recaptcha-site-key-here') {
        appLogger.info('Executing reCAPTCHA v3 for signup action');
        recaptchaToken = await (window as any).grecaptcha.execute(siteKey, { action: 'signup' });
        if (recaptchaToken) {
          appLogger.info('reCAPTCHA token obtained successfully for signup');
        } else {
          appLogger.warn('reCAPTCHA token was empty for signup');
        }
      } else {
        appLogger.info('reCAPTCHA not configured for signup - proceeding without reCAPTCHA');
      }
    } catch (recaptchaError) {
      appLogger.error('reCAPTCHA execution failed for signup', { error: String(recaptchaError) });
      // Non-fatal; continue with signup
    }
    
    try {
      // Register with PostgreSQL auth
      const _result = await postgresAuth.register({ // TODO: Use registration result
        email,
        password,
        name: name || undefined
      });
      
      setSuccess("Account created successfully! Please check your email to verify your account.");
      
      // Redirect to signin page after successful registration
      setTimeout(() => {
        router.push('/auth/signin?message=account_created');
      }, 2000);
      
    } catch (err) {
      appLogger.error('Sign up error', { error: String(err) });
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
    
    setPending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {siteKey && siteKey !== 'your-recaptcha-site-key-here' && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          strategy="afterInteractive"
        />
      )}
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join JewGo to save favorites and discover kosher restaurants
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
            {success}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={onEmailSignUp}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Full Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={pending}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>

        {/* Note about OAuth providers */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Note</span>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            OAuth providers (Google, Apple) are not currently supported in the PostgreSQL authentication system.
            Please use email and password to create your account.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpFormWithParams />
    </Suspense>
  );
}
