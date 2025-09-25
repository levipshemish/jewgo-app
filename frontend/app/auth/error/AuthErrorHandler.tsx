"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth";

function messageFor(code: string | null): { title: string; description: string } {
  switch (code) {
    case "oauth_denied":
      return {
        title: "Sign-in was cancelled",
        description: "You denied the OAuth request. Please try again and grant access to continue.",
      };
    case "missing_params":
      return {
        title: "Invalid callback",
        description: "Required parameters were missing from the authentication callback.",
      };
    case "oauth_failed":
      return {
        title: "OAuth failed",
        description: "We couldn't complete sign-in with your provider. Please try again.",
      };
    case "magic_link_invalid":
      return {
        title: "Magic link invalid or expired",
        description: "Please request a new magic link and try again.",
      };
    case "service_error":
      return {
        title: "Service unavailable",
        description: "The authentication service encountered an error. Please try again shortly.",
      };
    default:
      return {
        title: "Authentication error",
        description: "Something went wrong during sign-in. Please try again.",
      };
  }
}

export default function AuthErrorHandler() {
  const params = useSearchParams();
  const code = params.get("error");
  const details = params.get("details");
  const timestamp = params.get("timestamp");
  const msg = useMemo(() => messageFor(code), [code]);

  // Enhanced error reporting for OAuth debugging
  const debugInfo = {
    error_code: code,
    error_details: details,
    timestamp,
    url_params: Object.fromEntries(params.entries()),
    user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    current_time: new Date().toISOString()
  };

  // Log error details for debugging
  console.error('[Auth Error] OAuth failure details:', debugInfo);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <AuthCard variant="error" title={msg.title}>
          <p className="text-sm text-gray-700">{msg.description}</p>
          
          {/* Show additional error details in development or for debugging */}
          {(details || process.env.NODE_ENV === 'development') && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <p className="text-xs text-gray-600 font-mono">
                Error Code: {code || 'unknown'}
              </p>
              {details && (
                <p className="text-xs text-gray-600 font-mono mt-1">
                  Details: {details}
                </p>
              )}
              {timestamp && (
                <p className="text-xs text-gray-600 font-mono mt-1">
                  Time: {new Date(timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}
          
          <div className="mt-6 space-y-3">
            <Link
              href="/auth/signin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 w-full justify-center"
            >
              Back to sign in
            </Link>
            
            {/* Add clear session button for OAuth failures */}
            {code === 'oauth_failed' && (
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/v5/auth/clear-session', {
                      method: 'POST',
                      credentials: 'include',
                    });
                  } catch (e) {
                    console.warn('Failed to clear session via API:', e);
                  } finally {
                    window.location.href = '/auth/signin';
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 w-full justify-center"
              >
                Clear session and try again
              </button>
            )}
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
