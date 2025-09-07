"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postgresAuth } from "@/lib/auth/postgres-auth";
import Link from "next/link";

function EmailVerificationForm() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError("Verification token is missing");
        return;
      }

      setIsVerifying(true);
      setError(null);

      try {
        // Verify email using PostgreSQL auth
        await postgresAuth.verifyEmail(token);
        setSuccess(true);
        
        // Redirect to signin page after a short delay
        setTimeout(() => {
          router.push('/auth/signin?message=email_verified');
        }, 5000);
        
      } catch (verifyError) {
        setError("Failed to verify email. The token may be invalid or expired.");
        console.error('Email verification error:', verifyError);
      } finally {
        setIsVerifying(false);
      }
    };

    // Auto-verify when component mounts if token is present
    if (token) {
      verifyEmail();
    }
  }, [token, router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Verifying Email...</h1>
          <p className="text-gray-600">Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-6">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Verified Successfully!</h1>
            <p className="text-gray-600 mb-6">
              Your email has been verified. You can now access all features of your JewGo account.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You will be redirected to the sign-in page in a few seconds...
            </p>
            
            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sign In Now
              </Link>
              <Link
                href="/"
                className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-6">✗</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/auth/signin"
                className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">Need help?</p>
              <div className="space-y-2">
                <Link
                  href="/auth/resend-verification"
                  className="text-blue-600 hover:text-blue-500 text-sm block"
                >
                  Resend verification email
                </Link>
                <Link
                  href="/support"
                  className="text-gray-500 hover:text-gray-700 text-sm block"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No token case
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Verification</h1>
          <p className="text-gray-600 mb-6">
            To verify your email, please click the verification link sent to your email address.
          </p>
          
          <div className="space-y-3">
            <Link
              href="/auth/resend-verification"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Resend Verification Email
            </Link>
            <Link
              href="/auth/signin"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <EmailVerificationForm />
    </Suspense>
  );
}