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
import { Check, AlertCircle } from 'lucide-react';

interface SignUpFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

export default function SignUpPage() {
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
  const { register } = useAuth();
  const router = useRouter();

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
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
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
        router.push('/specials');
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
        </div>

        {errors.general && <div className="text-sm text-red-500 text-center">{errors.general}</div>}

        {/* Terms Agreement */}
        <div className="text-sm text-gray-600 text-center">
          By selecting Agree and continue below, I agree to <span className="underline">Jewgo's Terms of Service</span>,{" "}
          <span className="underline">Payments Terms of Service</span> and{" "}
          <span className="underline">Privacy Policy</span>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl"
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
    </AuthLayout>
  );
}