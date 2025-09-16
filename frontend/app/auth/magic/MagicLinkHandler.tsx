"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function MagicLinkHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const rt = useMemo(() => searchParams.get("rt") || "/", [searchParams]);

  useEffect(() => {
    // Validate required params
    if (!token || !email) {
      router.replace("/auth/error?error=magic_link_invalid");
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";
    if (!backendUrl) {
      setError("Missing backend URL configuration");
      return;
    }

    try {
      const url = `${backendUrl.replace(/\/$/, "")}/api/v5/auth/magic/consume?token=${encodeURIComponent(
        token
      )}&email=${encodeURIComponent(email)}&rt=${encodeURIComponent(rt)}`;
      // Navigate via full page load to allow HttpOnly cookies to be set by backend
      window.location.replace(url);
    } catch {
      setError("Failed to redirect to authentication service");
    }
  }, [token, email, rt, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">Signing you in…</h1>
          <p className="mt-2 text-gray-600">
            We&apos;re verifying your magic link and completing sign-in.
          </p>
          {error && (
            <p className="mt-4 text-red-600">{error}</p>
          )}
          <p className="mt-6 text-sm text-gray-500">
            If you are not redirected automatically,
            {" "}
            <a
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-500"
            >
              return to sign in
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
