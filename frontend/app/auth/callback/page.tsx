"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const [status, setStatus] = useState<string>("Processing authentication...");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we have tokens in the URL fragment
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const errorParam = params.get("error");
        const errorDescription = params.get("error_description");
        
        // Get redirectTo from search params
        const redirectTo = searchParams.get("redirectTo") || "/";

        console.log('Auth callback processing:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasError: !!errorParam,
          redirectTo
        });

        // Handle OAuth errors
        if (errorParam) {
          setError(`OAuth error: ${errorDescription || errorParam}`);
          setStatus("Authentication failed");
          setTimeout(() => {
            router.push(`/auth/signin?error=oauth_error&redirectTo=${encodeURIComponent(redirectTo)}`);
          }, 3000);
          return;
        }

        // Handle successful OAuth with tokens
        if (accessToken && refreshToken) {
          setStatus("Setting up session...");
          
          const { data, error } = await supabaseBrowser.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Session setup error:', error);
            setError(`Session error: ${error.message}`);
            setStatus("Failed to establish session");
            setTimeout(() => {
              router.push(`/auth/signin?error=session_error&redirectTo=${encodeURIComponent(redirectTo)}`);
            }, 3000);
            return;
          }

          if (data.session) {
            console.log('Session established successfully');
            setStatus("Authentication successful! Redirecting...");
            setTimeout(() => {
              router.push(redirectTo);
            }, 1000);
            return;
          }
        }

        // Check for OAuth code (standard flow)
        const code = searchParams.get("code");
        if (code) {
          setStatus("Exchanging code for session...");
          
          const { data, error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            setError(`Code exchange error: ${error.message}`);
            setStatus("Failed to exchange code");
            setTimeout(() => {
              router.push(`/auth/signin?error=code_exchange_error&redirectTo=${encodeURIComponent(redirectTo)}`);
            }, 3000);
            return;
          }

          if (data.session) {
            console.log('Session established via code exchange');
            setStatus("Authentication successful! Redirecting...");
            setTimeout(() => {
              router.push(redirectTo);
            }, 1000);
            return;
          }
        }

        // No valid authentication found
        setError("No valid authentication found");
        setStatus("Authentication failed");
        setTimeout(() => {
          router.push(`/auth/signin?error=no_auth&redirectTo=${encodeURIComponent(redirectTo)}`);
        }, 3000);

      } catch (err) {
        console.error('Callback processing error:', err);
        setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setStatus("Authentication failed");
        setTimeout(() => {
          router.push(`/auth/signin?error=unexpected_error&redirectTo=${encodeURIComponent(searchParams.get("redirectTo") || "/")}`);
        }, 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

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
