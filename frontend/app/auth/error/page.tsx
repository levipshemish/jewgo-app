import React, { Suspense } from "react";
import AuthErrorHandler from "./AuthErrorHandler";
import { AuthCard } from "@/components/auth";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorLoadingUI />}>
      <AuthErrorHandler />
    </Suspense>
  );
}

function AuthErrorLoadingUI() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <AuthCard variant="error" title="Loading...">
          <p className="text-sm text-gray-700">Checking error details...</p>
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

