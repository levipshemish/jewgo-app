"use client";

import { AuthLayout } from '@/components/auth/AuthLayout';
import { InputField } from '@/components/auth/InputField';
import { Button } from '@/components/ui/button';
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';
import ComingSoonModal from '@/components/ui/ComingSoonModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    identifier: "", // username, email, or mobile number
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showAppleComingSoon, setShowAppleComingSoon] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || searchParams.get("callbackUrl") || "/specials";

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
            className="w-full flex items-center justify-center space-x-2"
            title="Sign in with Google"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </Button>

          {/* Apple OAuth */}
          <AppleSignInButton
            onClick={() => setShowAppleComingSoon(true)}
            enabled={true}
          />
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
    </AuthLayout>
  );
}
