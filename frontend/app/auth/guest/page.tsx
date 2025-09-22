"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postgresAuth } from "@/lib/auth/postgres-auth";

export default function GuestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGuestContinue = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Ensure CSRF is available before attempting guest login
      try {
        await postgresAuth.getCsrf();
      } catch (e) {
        setError('Authentication service is temporarily unavailable. Guest sessions are disabled.');
        setIsLoading(false);
        return;
      }

      await postgresAuth.guestLogin();
      
      // Redirect to main app after successful guest login
      router.push('/eatery');
    } catch (e: any) {
      console.error('Guest login failed:', e);
      setError(e.message || 'Failed to start guest session. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-green-500 rounded-3xl p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">g</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-4">Continue as Guest</h1>
          <p className="text-gray-400">
            Browse kosher restaurants and features without creating an account. 
            You can always sign up later to save your favorites.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGuestContinue}
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            {isLoading ? "Starting Guest Session..." : "Continue as Guest"}
          </button>

          <div className="text-center text-gray-400 text-sm">
            or
          </div>

          <a
            href="/auth/signup"
            className="w-full bg-transparent border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-medium py-3 px-4 rounded-xl text-center block transition-colors"
          >
            Create Account
          </a>

          <a
            href="/auth/login"
            className="w-full text-green-400 hover:text-green-300 font-medium py-3 text-center block transition-colors"
          >
            Sign In
          </a>
        </div>

        <div className="text-xs text-gray-500 mt-6">
          <p>Guest features include:</p>
          <ul className="list-disc list-inside text-left mt-2 space-y-1">
            <li>Browse restaurants and reviews</li>
            <li>Search and filter locations</li>
            <li>View restaurant details</li>
          </ul>
          <p className="mt-3 text-center">
            Sign up to save favorites, write reviews, and access all features.
          </p>
        </div>
      </div>
    </div>
  );
}
