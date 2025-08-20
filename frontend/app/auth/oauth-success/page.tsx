"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

// Force dynamic rendering to prevent Supabase issues during build
export const dynamic = 'force-dynamic';

import { supabaseBrowser } from "@/lib/supabase/client";

function OAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      try {
        // First, check if we have a session already
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (session) {
          setStatus("Already authenticated! Syncing user data...");
          await syncUserData(session.user);
          // Remove setTimeout delay - redirect immediately
          router.push('/eatery');
          return;
        }

        // Get the hash from the URL
        const hash = window.location.hash.substring(1); // Remove the # symbol
        
        if (!hash) {
          // No hash found - check if we're coming from the error page
          const error = searchParams.get('error');
          if (error === 'no_code') {
            setStatus("OAuth flow completed. Checking for tokens...");
            // Remove setTimeout delay - check immediately
            const currentHash = window.location.hash.substring(1);
            if (currentHash && currentHash.includes('access_token')) {
              await handleTokens(currentHash);
            } else {
              setStatus("No authentication tokens found. Please try signing in again.");
              // Remove setTimeout delay - redirect immediately
              router.push('/auth/supabase-signin');
            }
            return;
          } else {
            setStatus("No authentication data found. Please try signing in again.");
            // Remove setTimeout delay - redirect immediately
            router.push('/auth/supabase-signin');
            return;
          }
        }

        // Process tokens from hash
        await handleTokens(hash);

      } catch {
        setStatus("Unexpected error occurred");
        // Remove setTimeout delay - redirect immediately
        router.push('/auth/auth-code-error?error=unexpected');
      }
    };

    const handleTokens = async (hash: string) => {
      const params = new URLSearchParams(hash);
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken) {
        setStatus("Error: No access token found");
        // Remove setTimeout delay - redirect immediately
        router.push('/auth/auth-code-error?error=no_token');
        return;
      }

      setStatus("Setting up your session...");

      // Set the session manually using Supabase client
      const { data, error } = await supabaseBrowser.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (error) {
        setStatus("Error setting up session");
        // Remove setTimeout delay - redirect immediately
        router.push('/auth/auth-code-error?error=session_setup_failed');
        return;
      }

      if (data.session) {
        setStatus("Authentication successful! Syncing user data...");
        await syncUserData(data.session.user);
        // Remove setTimeout delay - redirect immediately
        router.push('/eatery');
      } else {
        setStatus("No session created");
        // Remove setTimeout delay - redirect immediately
        router.push('/auth/auth-code-error?error=no_session');
      }
    };

    const syncUserData = async (user: any) => {
      try {
        setStatus("Syncing user data with database...");
        
        // Call the sync API endpoint
        const response = await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
          }),
        });

        if (!response.ok) {
          // User sync failed, but continuing...
        } else {
          // User data synced successfully
        }
      } catch {
        // User sync error, but continuing...
        // Don't fail the auth flow if sync fails
      }
    };

    handleOAuthSuccess();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Authentication Successful!
        </h2>
        
        <p className="text-gray-600 mb-6">
          {status}
        </p>

        <div className="animate-pulse">
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h2>
        </div>
      </div>
    }>
      <OAuthSuccessContent />
    </Suspense>
  );
}
