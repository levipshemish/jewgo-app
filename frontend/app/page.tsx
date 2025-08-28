"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Force dynamic rendering to avoid SSR issues with Supabase client
export const dynamic = 'force-dynamic';

import { supabaseClient } from "@/lib/supabase/client-secure";
// import { extractIsAnonymous } from "@/lib/utils/auth-utils-client";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {

        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
          // console.error('Session check error:', error);
          setIsAuthenticated(false);
          // Redirect unauthenticated users to signin page
          router.push('/auth/signin');
          return;
        }
        
        // console.log('Session check result:', { 
        //   hasSession: !!session, 
        //   hasUser: !!session?.user,
        //   sessionExpiry: session?.expires_at,
        //   currentTime: Math.floor(Date.now() / 1000)
        // });
        
        if (user) {
          // Check if user is anonymous or regular user
          // const isAnonymous = extractIsAnonymous(session.user);

          setIsAuthenticated(true);
          
          // Redirect both anonymous and regular users to eatery page
          router.push('/eatery');
        } else {

          setIsAuthenticated(false);
          // Redirect unauthenticated users to signin page
          router.push('/auth/signin');
        }
      } catch (_error) {
        // console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        // Redirect unauthenticated users to signin page
        router.push('/auth/signin');
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event: string, _session: any) => {

        if (event === 'SIGNED_IN') {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (!user) { return; }
          // const isAnonymous = extractIsAnonymous(session.user);

          setIsAuthenticated(true);
          
          // Redirect to eatery page
          router.push('/eatery');
        } else if (event === 'SIGNED_OUT') {

          setIsAuthenticated(false);
          // Redirect to signin page when user signs out
          router.push('/auth/signin');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, supabaseClient]);

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