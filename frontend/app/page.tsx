"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabaseBrowser } from "@/lib/supabase/client";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        
        if (session?.user) {
          setIsAuthenticated(true);
          
          // Redirect authenticated users to eatery page
          router.push('/eatery');
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setIsAuthenticated(true);
          
          // Redirect to eatery page
          router.push('/eatery');
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);



  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jewgo-400 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jewgo-400 mx-auto mb-4"></div>
          <p className="text-neutral-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show sign-in page for unauthenticated users
  return (
    <div className="min-h-screen bg-neutral-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-jewgo-400 rounded-lg flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-white">g</span>
          </div>
        </div>
        
        {/* Title */}
        <div>
          <h2 className="text-center text-2xl font-bold text-white">
            Sign in to JewGo
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-400">
            Access your account to manage favorites and more
          </p>
        </div>
        
        {/* Sign In Form */}
        <form className="space-y-6">
          <div className="space-y-4">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-neutral-600 placeholder-neutral-400 text-white bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:border-jewgo-400 focus:z-10 text-base"
                placeholder="Username, email or mobile number"
              />
            </div>
            
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-neutral-600 placeholder-neutral-400 text-white bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-jewgo-400 focus:border-jewgo-400 focus:z-10 text-base"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-jewgo-400 hover:bg-jewgo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jewgo-400 disabled:opacity-50 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                router.push('/auth/signin');
              }}
            >
              Log in
            </button>
            
            <div className="text-left">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-neutral-800 text-neutral-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {/* Continue as Guest Button */}
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-neutral-600 rounded-lg shadow-sm bg-neutral-700 text-sm font-medium text-neutral-300 hover:bg-neutral-600 disabled:opacity-50 transition-colors"
                onClick={() => router.push('/auth/signin')}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Continue as Guest
              </button>
            </div>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push('/auth/signup')}
            className="w-full inline-flex justify-center py-2 px-4 border border-jewgo-400 rounded-lg shadow-sm bg-transparent text-sm font-medium text-jewgo-400 hover:bg-jewgo-400/10 transition-colors"
          >
            Create new account
          </button>
        </div>
      </div>
    </div>
  );
} 