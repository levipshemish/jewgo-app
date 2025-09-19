"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postgresAuth } from "@/lib/auth/postgres-auth";
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!token) {
      setError("Reset token is missing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Reset password using PostgreSQL auth
      await postgresAuth.resetPassword(token, password);
      setSuccess(true);
      
      // Redirect to signin page after a short delay
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
      
            } catch (resetError) {
      setError("Failed to reset password. Please try again.");
      console.error('Password reset error:', resetError);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle>Password Reset Successful</CardTitle>
              <CardDescription>Your password has been updated. Redirecting to sign in…</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-green-200 bg-green-50 text-green-700">
                <AlertDescription>Success! You can now sign in with your new password.</AlertDescription>
              </Alert>
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
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your new password below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" required minLength={8} className="pr-20" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-2 bottom-2 text-gray-600" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>

              <div className="relative">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required minLength={8} className="pr-20" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-2 bottom-2 text-gray-600" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(v => !v)}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Button>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Resetting…' : 'Reset Password'}
              </Button>
            </form>

            <div className="text-center mt-6">
              <a href="/auth/signin" className="text-blue-600 hover:text-blue-500 text-sm">
                Back to Sign In
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
