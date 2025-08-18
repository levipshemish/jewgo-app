'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        // Check for Supabase session
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // User is authenticated, redirect to eatery
          router.replace('/eatery');
        } else {
          // User is not authenticated, show landing page
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">JewGo</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to JewGo
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover kosher restaurants, synagogues, and Jewish businesses in your area
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              🍽️ Explore Kosher Eateries
            </h2>
            <p className="text-gray-600 mb-6">
              Find the best kosher restaurants, cafes, and food establishments near you.
            </p>
            <Link
              href="/eatery"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Start Exploring
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              🏛️ Find Synagogues
            </h2>
            <p className="text-gray-600 mb-6">
              Locate synagogues, mikvahs, and Jewish community centers in your area.
            </p>
            <Link
              href="/shuls"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Find Synagogues
            </Link>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              🔐 Authentication Systems
            </h2>
            <p className="text-gray-600 mb-6">
              We&apos;re currently testing both NextAuth.js and Supabase authentication systems.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">NextAuth.js (Current)</h3>
                <Link
                  href="/auth/signin"
                  className="block w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="block w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Supabase (Testing)</h3>
                <Link
                  href="/auth/supabase-signin"
                  className="block w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/supabase-signup"
                  className="block w-full bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>
            
            <div className="mt-6">
              <Link
                href="/test-supabase"
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Test Supabase Configuration
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 