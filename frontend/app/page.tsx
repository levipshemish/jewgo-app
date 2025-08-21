"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import SignInPage from "@/components/auth/SignInPage";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasRequestedLocation, setHasRequestedLocation] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        
        if (session?.user) {
          setIsAuthenticated(true);
          
          // Check if user has already been prompted for location
          const locationRequested = localStorage.getItem('locationRequested');
          if (!locationRequested) {
            // First time authenticated - redirect to location access
            router.push('/location-access');
          } else {
            // Already requested location - redirect to eatery
            router.push('/eatery');
          }
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
          
          // Check if user has already been prompted for location
          const locationRequested = localStorage.getItem('locationRequested');
          if (!locationRequested) {
            // First time authenticated - redirect to location access
            router.push('/location-access');
          } else {
            // Already requested location - redirect to eatery
            router.push('/eatery');
          }
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          // Clear location request flag on sign out
          localStorage.removeItem('locationRequested');
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
  return <SignInPage />;
} 