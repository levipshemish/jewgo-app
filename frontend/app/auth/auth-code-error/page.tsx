"use client";

import Link from "next/link";

import { Suspense, useEffect, useState } from "react";

function AuthCodeErrorContent() {
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const searchParams = new URLSearchParams(window.location.search);
    setError(searchParams.get("error"));
    setDescription(searchParams.get("description"));
  }, []);

  const getErrorMessage = () => {
    if (error === "org_internal") {
      return "Google OAuth is restricted to internal users only. Please contact the administrator.";
    }
    if (error === "redirect_uri_mismatch") {
      return "The redirect URI doesn't match the configured settings in Google Cloud Console.";
    }
    if (error === "invalid_client") {
      return "Invalid OAuth client configuration. Please check your Google OAuth credentials.";
    }
    if (error === "access_denied") {
      return "Access was denied. You may have cancelled the OAuth flow.";
    }
    if (error === "exchange_failed") {
      return "Failed to exchange authorization code for session. Please try again.";
    }
    if (error === "no_session") {
      return "No session was created. Please try signing in again.";
    }
    if (error === "no_code") {
      return "No authorization code was provided. Please try signing in again.";
    }
    if (description) {
      return description;
    }
    return "There was an issue with your authentication link. This could be because the link has expired, been used already, or there was a configuration issue.";
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Authentication Error
        </h2>
        
        <p className="text-gray-600 mb-6">
          {getErrorMessage()}
        </p>

        {error && (
          <div className="mb-6 p-3 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Error Code:</strong> {error}
            </p>
            {description && (
              <p className="text-xs text-gray-600 mt-1">
                <strong>Details:</strong> {description}
              </p>
            )}
          </div>
        )}
        
        <div className="space-y-4">
          <Link
                          href="/auth/signin"
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Signing In Again
          </Link>
          
          <Link
                          href="/auth/signup"
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create New Account
          </Link>
          
          <Link
            href="/"
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Home Page
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If you continue to have issues, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h2>
        </div>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  );
}
