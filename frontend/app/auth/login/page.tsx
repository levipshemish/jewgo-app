"use client";

import { AuthLayout } from '@/components/auth/AuthLayout';
import { InputField } from '@/components/auth/InputField';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    identifier: "", // username, email, or mobile number
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

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
        router.push('/specials');
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
    </AuthLayout>
  );
}
