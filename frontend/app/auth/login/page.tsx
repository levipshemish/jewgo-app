"use client";

import { Button } from '@/components/ui/button';
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
  const [_csrfReady, setCsrfReady] = useState<boolean | null>(null);
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
      } catch (_e) {
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
    <>
      <div className="min-h-screen bg-gray-800 flex flex-col">
        {/* Logo Section */}
        <div className="flex justify-center pt-8 pb-4">
          <div className="flex items-center space-x-2">
            <span className="text-white text-2xl font-bold">Jew</span>
            <span className="text-green-500 text-2xl font-bold">go</span>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
            {/* Form Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h1>
              <p className="text-green-600 text-sm">
                Or <Link href="/auth/signup" className="underline">create a new account</Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="text"
                  placeholder="Enter your email address"
                  value={formData.identifier}
                  onChange={(e) => handleInputChange("identifier", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.identifier && (
                  <p className="text-red-500 text-sm mt-1">{errors.identifier}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                      if (input) {
                        input.type = input.type === 'password' ? 'text' : 'password';
                      }
                    }}
                  >
                    Show
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {errors.general && (
                <div className="text-sm text-red-500 text-center">{errors.general}</div>
              )}

              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-green-600 hover:text-green-700 text-sm">
                  Forgot your password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-xl transition-colors"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* OAuth Section */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {/* Google OAuth */}
                <button
                  onClick={() => {
                    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
                    if (!backendUrl) {
                      setErrors({ general: 'Missing backend configuration' });
                      return;
                    }
                    const url = `${backendUrl.replace(/\/$/, '')}/api/v5/auth/google/start?returnTo=${encodeURIComponent(redirectTo)}`;
                    window.location.href = url;
                  }}
                  className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  title="Sign up with Google"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-700 font-medium">Sign up with Google</span>
                </button>

                {/* Apple OAuth */}
                <button
                  onClick={() => setShowAppleComingSoon(true)}
                  className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  title="Sign up with Apple"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span className="text-gray-700 font-medium">Sign up with Apple</span>
                </button>

                {/* Magic Link Button */}
                <button
                  onClick={() => setShowMagicLinkModal(true)}
                  disabled={magicLinkCooldown > 0}
                  className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span className="text-gray-700 font-medium">
                    {magicLinkCooldown > 0 ? `Magic link sent - wait ${magicLinkCooldown}s` : 'Sign up with Email'}
                  </span>
                </button>
              </div>

              {/* Guest Option */}
              <div className="mt-6 text-center">
                <Link href="/auth/guest" className="text-gray-600 hover:text-gray-800 text-sm">
                  Continue as guest
                </Link>
              </div>
            </div>
          </div>
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
              Enter your email address and we&apos;ll send you a secure magic link to sign in.
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
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}