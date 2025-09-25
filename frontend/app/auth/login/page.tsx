"use client";

import { AuthLayout } from '@/components/auth/AuthLayout';
import { InputField } from '@/components/auth/InputField';
import { Button } from '@/components/ui/button';
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';
import ComingSoonModal from '@/components/ui/ComingSoonModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, Suspense, useEffect } from 'react';
import { postgresAuth } from '@/lib/auth/postgres-auth';
import { useToast } from '@/components/ui/Toast';

function LoginPageContent() {
  const [formData, setFormData] = useState({
    identifier: "", // username, email, or mobile number
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showAppleComingSoon, setShowAppleComingSoon] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicStatus, setMagicStatus] = useState<string | null>(null);
  const [magicLinkCooldown, setMagicLinkCooldown] = useState<number>(0);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [csrfReady, setCsrfReady] = useState<boolean | null>(null);
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || searchParams.get("callbackUrl") || "/specials";

  // Check CSRF readiness
  useEffect(() => {
    const checkCsrf = async () => {
      try {
        await postgresAuth.getCsrf();
        setCsrfReady(true);
      } catch (e) {
        setCsrfReady(false);
      }
    };
    checkCsrf();
  }, []);

  // Rate limiting for magic link requests
  useEffect(() => {
    if (magicLinkCooldown > 0) {
      const timer = setTimeout(() => {
        setMagicLinkCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [magicLinkCooldown]);

  const handleMagicLinkSignIn = async () => {
    if (magicLinkCooldown > 0) return;

    try {
      setMagicStatus('sending');
      setErrors({});

      // Basic email format validation
      if (!magicEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(magicEmail)) {
        setMagicStatus(null);
        setErrors({ general: 'Please enter a valid email address to receive a magic link' });
        showError('Please enter a valid email address to receive a magic link');
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
      if (!backendUrl) {
        setMagicStatus(null);
        setErrors({ general: 'Missing backend configuration' });
        return;
      }

      const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/api/v5/auth/magic-link/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: magicEmail,
          returnTo: redirectTo,
        }),
        mode: 'cors',
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.success === false) {
        const msg = data?.error || 'Failed to send magic link';
        setMagicStatus(null);
        setErrors({ general: msg });
        showError(msg);
        return;
      }

      setMagicStatus('sent');
      showSuccess(`Magic link sent to ${magicEmail}! Check your email.`);
      setMagicLinkCooldown(60);
      
      // Close modal and reset email after successful send
      setTimeout(() => {
        setShowMagicLinkModal(false);
        setMagicEmail('');
        setMagicStatus(null);
      }, 2000);
      
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to send magic link' });
      setMagicStatus(null);
      showError(error.message || 'Failed to send magic link');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    const newErrors: Record<string, string> = {};

    if (!formData.identifier) {
      newErrors.identifier = "Username, email or mobile number is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        // Use email as identifier for now (can be enhanced later)
        await login(formData.identifier, formData.password);
        router.push(redirectTo);
      } catch (error: any) {
        setErrors({ general: error.message || 'Login failed' });
      }
    }

    setIsLoading(false);
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          placeholder="Username, email or mobile number"
          value={formData.identifier}
          onChange={(e) => handleInputChange("identifier", e.target.value)}
          error={errors.identifier}
        />

        <InputField
          placeholder="Password"
          type="password"
          showPasswordToggle
          value={formData.password}
          onChange={(e) => handleInputChange("password", e.target.value)}
          error={errors.password}
        />

        {errors.general && (
          <div className="text-sm text-red-500 text-center">{errors.general}</div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>

        <div className="text-center">
          <Link href="/auth/forgot-password" className="text-gray-400 hover:text-gray-300 text-sm">
            Forgot password?
          </Link>
        </div>

        <div className="space-y-4 pt-4">
          <Link
            href="/auth/signup"
            className="w-full bg-transparent border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-medium py-3 rounded-xl text-center block transition-colors"
          >
            Create new account
          </Link>

          <Link
            href="/auth/guest"
            className="w-full text-green-400 hover:text-green-300 font-medium py-3 text-center block transition-colors"
          >
            Continue as guest
          </Link>
        </div>
      </form>

      {/* OAuth Section */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          {/* Google OAuth */}
          <Button
            onClick={() => {
              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
              if (!backendUrl) {
                setErrors({ general: 'Missing backend configuration' });
                return;
              }
              const url = `${backendUrl.replace(/\/$/, '')}/api/v5/auth/google/start?returnTo=${encodeURIComponent(redirectTo)}`;
              window.location.href = url;
            }}
            variant="outline"
            className="w-full"
            title="Sign in with Google"
          >
            Continue with Google
          </Button>

          {/* Apple OAuth */}
          <Button
            onClick={() => setShowAppleComingSoon(true)}
            variant="outline"
            className="w-full"
            title="Sign in with Apple"
          >
            Continue with Apple
          </Button>

          {/* Magic Link Button - Opens Modal */}
          <Button
            onClick={() => setShowMagicLinkModal(true)}
            disabled={magicLinkCooldown > 0}
            variant="outline"
            className="w-full mt-4"
          >
            {magicLinkCooldown > 0 ? (
              `Magic link sent - wait ${magicLinkCooldown}s`
            ) : (
              '🔗 Sign in with Magic Link'
            )}
          </Button>
        </div>
      </div>

      {/* Apple Coming Soon Modal */}
      <ComingSoonModal
        isOpen={showAppleComingSoon}
        onClose={() => setShowAppleComingSoon(false)}
        title="Apple Sign-In Coming Soon"
        description="We're currently configuring Apple Sign-In authentication. This feature will be available soon!"
        feature="Apple Sign-In"
      />

      {/* Magic Link Modal */}
      {showMagicLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Magic Link Sign-in</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMagicLinkModal(false);
                  setMagicEmail('');
                  setMagicStatus(null);
                }}
                className="text-gray-600"
              >
                ✕
              </Button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Enter your email address and we'll send you a secure magic link to sign in.
            </p>

            <div className="mb-4">
              <label htmlFor="modal-magic-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                id="modal-magic-email"
                name="modal-magic-email"
                type="email"
                autoComplete="off"
                placeholder="Enter your email address"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && magicEmail.trim() && magicLinkCooldown === 0 && magicStatus !== 'sending') {
                    handleMagicLinkSignIn();
                  } else if (e.key === 'Escape') {
                    setShowMagicLinkModal(false);
                    setMagicEmail('');
                    setMagicStatus(null);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {magicStatus === 'sent' && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md mb-4">
                ✅ Magic link sent! Check your email.
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMagicLinkModal(false);
                  setMagicEmail('');
                  setMagicStatus(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleMagicLinkSignIn}
                disabled={magicLinkCooldown > 0 || magicStatus === 'sending' || !magicEmail.trim()}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                {magicLinkCooldown > 0 ? (
                  `Wait ${magicLinkCooldown}s`
                ) : magicStatus === 'sending' ? (
                  'Sending...'
                ) : !magicEmail.trim() ? (
                  'Enter Email'
                ) : (
                  'Send Magic Link'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
