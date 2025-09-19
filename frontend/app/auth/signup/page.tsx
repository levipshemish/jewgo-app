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
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csrfReady, setCsrfReady] = useState<boolean | null>(null);
  const [csrfMessage, setCsrfMessage] = useState<string | null>(null);
  const { showError } = useToast();
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


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {siteKey && siteKey !== 'your-recaptcha-site-key-here' && (
        <Script src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`} strategy="afterInteractive" />
      )}
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Join JewGo to save favorites and discover kosher restaurants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

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
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-700">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {/* Success toast handled via useToast */}

        <form className="mt-2 space-y-6" onSubmit={onEmailSignUp}>
          <div className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <Input id="name" name="name" type="text" autoComplete="name" placeholder="Full Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">Email address</label>
              <Input id="email-address" name="email" type="email" autoComplete="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required placeholder="Password" className="pr-20" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="button" variant="ghost" size="sm" className="absolute right-2 bottom-2 text-gray-600" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? 'Hide' : 'Show'}
              </Button>
              {password && (
                <div className="mt-2">
                  <PasswordStrengthIndicator password={password} />
                </div>
              )}
            </div>
            <div className="relative">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <Input id="confirm-password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required placeholder="Confirm Password" className="pr-20" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <Button type="button" variant="ghost" size="sm" className="absolute right-2 bottom-2 text-gray-600" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(v => !v)}>
                {showConfirmPassword ? 'Hide' : 'Show'}
              </Button>
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
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Creating account…' : 'Create account'}
            </Button>
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
            <Button onClick={handleGuestContinue} disabled={csrfReady === false} variant="outline" className="w-full" title="Start a temporary guest session">
              {csrfReady === false ? 'Guest temporarily unavailable' : 'Continue as Guest'}
            </Button>

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
          </CardContent>
        </Card>
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
