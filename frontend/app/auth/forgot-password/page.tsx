"use client";

import React, { useState } from 'react';
import Link from "next/link";
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { forgotPasswordAction } from "./actions";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set('email', email);
    const result = await forgotPasswordAction(formData);
    
    if (!result.ok) {
      setError(result.message);
    } else {
      setIsSuccess(true);
    }
    
    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We&apos;ve sent a password reset link to <span className="font-medium text-gray-900">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <Alert className="border-green-200 bg-green-50 text-green-700">
                <AlertDescription>Reset link sent successfully.</AlertDescription>
              </Alert>
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button onClick={() => setIsSuccess(false)} className="text-blue-600 hover:text-blue-500">
                  try again
                </button>
              </p>
              <Link href="/auth/signin" className="text-blue-600 hover:text-blue-500 text-sm">
                Back to sign in
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter your email address to receive a password reset link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <Alert className="border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
              </div>

              <div>
                <Button type="submit" disabled={isLoading} className="w-full rounded-full">
                  {isLoading ? 'Sending…' : 'Send reset link'}
                </Button>
              </div>

              <div className="text-center">
                <Link href="/auth/signin" className="text-blue-600 hover:text-blue-500">
                  Back to sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
