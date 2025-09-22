"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

import { postgresAuth } from "@/lib/auth/postgres-auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await postgresAuth.getProfile();
        if (profile && profile.is_guest !== true && profile.email) {
          router.push('/eatery');
        } else {
          router.push('/auth/signin');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/signin');
      }
    };

    checkAuth();

    // Set up auth state listener for PostgreSQL auth
    const checkAuthState = async () => {
      const cachedState = postgresAuth.getCachedAuthState ? postgresAuth.getCachedAuthState() : (postgresAuth.isAuthenticated() ? 'authenticated' : 'unauthenticated');

      if (cachedState === 'authenticated') {
        router.push('/eatery');
        return;
      }

      if (cachedState === 'unknown') {
        try {
          const profile = await postgresAuth.getProfile();
          if (profile && profile.is_guest !== true && profile.email) {
            router.push('/eatery');
            return;
          }
        } catch (error) {
          console.error('Periodic auth check failed:', error);
        }
      }

      router.push('/auth/signin');
    };

    // Check auth state periodically (since PostgreSQL auth doesn't have built-in listeners)
    const authCheckInterval = setInterval(() => {
      void checkAuthState();
    }, 5000);

    return () => {
      clearInterval(authCheckInterval);
    };
  }, [router]);

  // Show loading while checking authentication and redirecting
  return (
    <div className="min-h-screen bg-neutral-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jewgo-400 mx-auto mb-4"></div>
        <p className="text-neutral-400">Loading...</p>
      </div>
    </div>
  );
} 
