"use client";

import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';

export default function MobilePage() {
  const [formData, setFormData] = useState({
    mobile: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateMobile = (mobile: string) => {
    // Basic mobile validation - adjust regex as needed
    const mobileRegex = /^[+]?[1-9][\d]{0,15}$/;
    return mobileRegex.test(mobile.replace(/\s/g, ""));
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const newErrors: Record<string, string> = {};

    if (!formData.mobile) {
      newErrors.mobile = "Mobile number required.";
    } else if (!validateMobile(formData.mobile)) {
      newErrors.mobile = "Please enter a valid mobile number.";
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        // TODO: Submit to API
        console.log("Mobile data submitted:", formData);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Redirect to verification
        window.location.href = `/auth/verify?phone=${encodeURIComponent(formData.mobile)}`;
      } catch (error) {
        console.error("Mobile submission error:", error);
      }
    }

    setIsLoading(false);
  };

  return (
    <AuthLayout title="What's your mobile number?" subtitle="Enter the mobile number where you can be contacted. No one will see this on your profile.">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <input
            type="tel"
            placeholder="Mobile number"
            value={formData.mobile}
            onChange={(e) => handleInputChange("mobile", e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-800 text-white placeholder-gray-400 focus:outline-none transition-colors ${
              errors.mobile ? "border-red-500 focus:border-red-500" : "border-gray-700 focus:border-green-500"
            }`}
          />
          {errors.mobile && <p className="text-sm text-red-500">{errors.mobile}</p>}
        </div>

        <div className="space-y-2">
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-800 text-white placeholder-gray-400 focus:outline-none transition-colors ${
              errors.email ? "border-red-500 focus:border-red-500" : "border-gray-700 focus:border-green-500"
            }`}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>

        <p className="text-sm text-gray-400">
          You may receive SMS notifications from us for security and login purposes.
        </p>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl"
        >
          {isLoading ? "Processing..." : "Next"}
        </Button>
      </form>

      <div className="text-center mt-6">
        <Link href="/auth/login" className="text-green-400 hover:text-green-300 text-sm">
          I already have an account
        </Link>
      </div>
    </AuthLayout>
  );
}
