"use client";

import { appLogger } from '@/lib/utils/logger';
import Link from "next/link";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { postgresAuth } from "@/lib/auth/postgres-auth";
import { useToast } from '@/components/ui/Toast';
import { handleAuthError } from '@/lib/auth/error-handler';
import { validatePassword } from "@/lib/utils/password-validation";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";

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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csrfReady, setCsrfReady] = useState<boolean | null>(null);
  const [csrfMessage, setCsrfMessage] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgradePassword, setUpgradePassword] = useState("");
  const [upgradeName, setUpgradeName] = useState("");
  const [upgradePending, setUpgradePending] = useState(false);
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  
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
        window.location.assign(_redirectTo);
      } else {
        router.push(_redirectTo);
      }
    } catch (e) {
      appLogger.error('Guest login failed (signup page)', { error: String(e) });
      setError('Failed to start a guest session');
    }
  };

  // Probe CSRF availability on mount
  // We only use this to disable the guest button and display a banner
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
        appLogger.error('CSRF init failed (signup)', { error: String(msg) });
        if (!cancelled) {
          setCsrfReady(false);
          setCsrfMessage('Authentication service is temporarily unavailable. Guest sessions are disabled.');
        }
      }
    })();
    return () => { cancelled = true; };
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

    // Validate terms acceptance
    if (!termsAccepted) {
      setError("You must accept the terms and conditions to create an account");
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
        name: name || undefined,
        terms_accepted: termsAccepted
      });
      
      setSuccess("Account created successfully! Please check your email to verify your account.");
      
      // Redirect to signin page after successful registration
      setTimeout(() => {
        router.push('/auth/signin?message=account_created');
      }, 2000);
      
    } catch (err) {
      const authError = handleAuthError(err, 'signup', { email });
      setError(authError.message);
      showError(authError.message);
    }
    
    setPending(false);
  };

  // Upgrade current guest session to full account (alternative to new signup)
  const handleUpgradeGuest = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(false);
    setSuccess(null);
    setUpgradePending(true);
    try {
      if (!upgradeEmail || !upgradePassword) {
        setError('Email and password are required to upgrade');
        return;
      }
      await postgresAuth.upgradeGuest({ email: upgradeEmail, password: upgradePassword, name: upgradeName || undefined });
      showSuccess('Your account was upgraded successfully! Redirecting…');
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.assign(_redirectTo);
        } else {
          router.push(_redirectTo);
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

        {/* CSRF/Service Banner */}
        {csrfReady === false && csrfMessage && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative">
            {csrfMessage}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
            {success}
          </div>
        )}
        {/* Success toast handled via useToast */}

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
              {password && (
                <div className="mt-2">
                  <PasswordStrengthIndicator password={password} />
                </div>
              )}
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

          <div className="flex items-center">
            <input
              id="terms-accepted"
              name="termsAccepted"
              type="checkbox"
              required
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <label htmlFor="terms-accepted" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </a>
            </label>
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

        {/* Continue as Guest */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or</span>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleGuestContinue}
              disabled={csrfReady === false}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Start a temporary guest session"
            >
              {csrfReady === false ? 'Guest temporarily unavailable' : 'Continue as Guest'}
            </button>

            {/* Upgrade guest to full account */}
            <div className="mt-4 border rounded-md p-3 bg-white">
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
