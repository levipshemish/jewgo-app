"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const _router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Email address is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Make API call to resend verification email
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || ''}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend verification email');
      }

      setSuccess(true);
      
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Failed to resend verification email');
      console.error('Resend verification error:', resendError);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-6">📧</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Email Sent!</h1>
            <p className="text-gray-600 mb-6">
              We&apos;ve sent a new verification email to <strong>{email}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please check your inbox and click the verification link to activate your account.
              Don&apos;t forget to check your spam/junk folder if you don&apos;t see it.
            </p>
            
            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Go to Sign In
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Send to Different Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Resend Verification Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address to receive a new verification link
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                "Send Verification Email"
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <div className="space-y-2">
            <Link
              href="/auth/signin"
              className="font-medium text-blue-600 hover:text-blue-500 text-sm block"
            >
              Back to Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="font-medium text-gray-500 hover:text-gray-700 text-sm block"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResendVerificationForm />
    </Suspense>
  );
}
