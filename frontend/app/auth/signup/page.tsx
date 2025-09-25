"use client";

import { AuthLayout } from '@/components/auth/AuthLayout';
import { InputField } from '@/components/auth/InputField';
import { Button } from '@/components/ui/button';
import ComingSoonModal from '@/components/ui/ComingSoonModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface SignUpFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

function SignUpPageContent() {
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("weak");
  const [passwordMatch, setPasswordMatch] = useState<"match" | "no-match" | "empty">("empty");
  const [showAppleComingSoon, setShowAppleComingSoon] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || searchParams.get("callbackUrl") || "/specials";

  const handleInputChange = (field: keyof SignUpFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Update password strength
    if (field === "password") {
      if (value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value)) {
        setPasswordStrength("strong");
      } else if (value.length >= 6) {
        setPasswordStrength("medium");
      } else {
        setPasswordStrength("weak");
      }
      
      // Check password match when password changes
      if (formData.confirmPassword) {
        setPasswordMatch(value === formData.confirmPassword ? "match" : "no-match");
      }
    }

    // Update password match when confirm password changes
    if (field === "confirmPassword") {
      if (!value) {
        setPasswordMatch("empty");
      } else if (value === formData.password) {
        setPasswordMatch("match");
      } else {
        setPasswordMatch("no-match");
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (passwordMatch === "no-match") {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!termsAccepted) {
      newErrors.terms = "You must accept the terms and conditions to create an account";
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      try {
        await register({
          email: formData.email,
          password: formData.password,
          name: `${formData.firstName} ${formData.lastName}`,
        });
        router.push(redirectTo);
      } catch (error: any) {
        setErrors({ general: error.message || 'Registration failed' });
      }
    }

    setIsLoading(false);
  };

  return (
    <AuthLayout title="Let's sign up" subtitle="Create your Jewgo account">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="First Name"
            placeholder="First Name"
            value={formData.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            error={errors.firstName}
          />

          <InputField
            label="Last Name"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            error={errors.lastName}
          />
        </div>

        <InputField
          label="Email Address"
          placeholder="Enter your email address"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          error={errors.email}
        />

        <InputField
          label="Create Password"
          placeholder="Create Password"
          type="password"
          showPasswordToggle
          value={formData.password}
          onChange={(e) => handleInputChange("password", e.target.value)}
          error={errors.password}
        />

        <InputField
          label="Confirm Password"
          placeholder="Confirm Password"
          type="password"
          showPasswordToggle
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />

        {/* Password Strength Indicators */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            {passwordStrength === "weak" ? (
              <AlertCircle className="text-red-500" size={16} />
            ) : (
              <Check className="text-green-500" size={16} />
            )}
            <span className={`text-sm ${passwordStrength === "weak" ? "text-red-500" : "text-green-500"}`}>
              Password strength: {passwordStrength}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Check className="text-green-500" size={16} />
            <span className="text-sm text-green-500">Must be at least 8 characters</span>
          </div>

          {/* Password Match Indicator */}
          {formData.password && formData.confirmPassword && (
            <div className="flex items-center space-x-2">
              {passwordMatch === "match" ? (
                <Check className="text-green-500" size={16} />
              ) : (
                <AlertCircle className="text-red-500" size={16} />
              )}
              <span className={`text-sm ${passwordMatch === "match" ? "text-green-500" : "text-red-500"}`}>
                {passwordMatch === "match" ? "Passwords match" : "Passwords do not match"}
              </span>
            </div>
          )}
        </div>

        {errors.general && <div className="text-sm text-red-500 text-center">{errors.general}</div>}

        {/* Terms Agreement */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
              By selecting Agree and continue below, I agree to{" "}
              <a 
                href="/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-600 underline"
              >
                Jewgo&apos;s Terms of Service
              </a>
              ,{" "}
              <a 
                href="/terms#payments" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-600 underline"
              >
                Payments Terms of Service
              </a>
              {" "}and{" "}
              <a 
                href="/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-600 underline"
              >
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.terms && (
            <div className="text-sm text-red-500">{errors.terms}</div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || !termsAccepted || passwordMatch === "no-match"}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl"
        >
          {isLoading ? "Creating Account..." : "Agree & Continue"}
        </Button>

        <div className="text-center space-y-3">
          <Link href="/auth/login" className="text-green-500 hover:text-green-600 text-sm block">
            Already have an account? Sign in
          </Link>
          
          <div className="text-gray-400 text-sm">or</div>
          
          <Link href="/auth/guest" className="text-green-400 hover:text-green-300 text-sm block">
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

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpPageContent />
    </Suspense>
  );
}