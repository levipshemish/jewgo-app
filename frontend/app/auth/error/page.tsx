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
        description: "We couldn’t complete sign-in with your provider. Please try again.",
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

export default function AuthErrorPage() {
  const params = useSearchParams();
  const code = params.get("error");
  const msg = useMemo(() => messageFor(code), [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <AuthCard variant="error" title={msg.title}>
          <p className="text-sm text-gray-700">{msg.description}</p>
          <div className="mt-6">
            <Link
              href="/auth/signin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to sign in
            </Link>
          </div>
        </AuthCard>
      </div>
    </div>
  );
}

