"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const [status, setStatus] = useState<string>("Processing authentication...");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Process the callback
        const result = await supabaseBrowser.auth.exchangeCodeForSession(
          searchParams.get('code') || ''
        );

        if (result?.error) {
          setError(result.error.message);
          return;
        }

        // Get session to verify authentication
        const session = await supabaseBrowser.auth.getSession();
        if (session?.data?.session) {
          // Session established successfully
          router.push(searchParams.get("redirectTo") || '/');
        } else {
          setError('Failed to establish session');
        }
      } catch (error) {
        setError('Authentication failed');
      }
    };

    if (searchParams.get('code')) {
      processCallback();
    }
  }, [searchParams, router]);

  useEffect(() => {
    const processCodeExchange = async () => {
      try {
        const result = await supabaseBrowser.auth.exchangeCodeForSession(
          searchParams.get('code') || ''
        );

        if (result?.error) {
          setError(result.error.message);
          return;
        }

        // Session established via code exchange
        router.push(searchParams.get("redirectTo") || '/');
      } catch (error) {
        setError('Code exchange failed');
      }
    };

    if (searchParams.get('code') && !isProcessing) {
      setIsProcessing(true);
      processCodeExchange();
    }
  }, [searchParams, router, isProcessing]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {status}
          </h2>
          {error && (
            <p className="text-red-600 text-sm">
              {error}
            </p>
          )}
          <p className="text-gray-600 text-sm">
            Please wait while we complete your authentication...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Loading...
            </h2>
            <p className="text-gray-600 text-sm">
              Please wait while we process your authentication...
            </p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
