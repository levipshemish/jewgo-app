"use client";

import { AuthLayout } from '@/components/auth/AuthLayout';
import { InputField } from '@/components/auth/InputField';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!email) {
      setError("Email is required");
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Submit to API
      console.log("Password reset requested for:", email);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitted(true);
    } catch (_error) {
      setError("Failed to send reset email. Please try again.");
    }

    setIsLoading(false);
  };

  if (isSubmitted) {
    return (
      <AuthLayout title="Check your email">
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <button onClick={() => setIsSubmitted(false)} className="text-green-500 hover:text-green-600 underline">
              try again
            </button>
          </p>
          <Link href="/auth/login" className="inline-block text-green-500 hover:text-green-600 font-medium">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email address and we'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          label="Email Address"
          placeholder="Enter your email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl"
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </Button>

        <div className="text-center">
          <Link href="/auth/login" className="text-green-500 hover:text-green-600 text-sm">
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}