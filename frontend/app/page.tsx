"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Force dynamic rendering to avoid SSR issues with Supabase client
export const dynamic = 'force-dynamic';

import { supabaseBrowser } from "@/lib/supabase/client";
import { extractIsAnonymous } from "@/lib/utils/auth-utils-client";

export default function HomePage() {
  const [_isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // console.log('Checking authentication on home page...');
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        
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
        
        if (session?.user) {
          // Check if user is anonymous or regular user
          // const isAnonymous = extractIsAnonymous(session.user);
          // console.log('Home page auth check:', { 
          //   hasUser: !!session.user, 
          //   isAnonymous, 
          //   userId: session.user.id,
          //   userEmail: session.user.email
          // });
          
          setIsAuthenticated(true);
          
          // Redirect both anonymous and regular users to eatery page
          router.push('/eatery');
        } else {
          // console.log('Home page auth check: No session found');
          setIsAuthenticated(false);
          // Redirect unauthenticated users to signin page
          router.push('/auth/signin');
        }
      } catch (error) {
        // console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        // Redirect unauthenticated users to signin page
        router.push('/auth/signin');
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event: string, session: any) => {
        // console.log('Auth state change:', { event, hasUser: !!session?.user });
        
        if (event === 'SIGNED_IN' && session?.user) {
          // const isAnonymous = extractIsAnonymous(session.user);
          // console.log('User signed in:', { isAnonymous, userId: session.user.id });
          
          setIsAuthenticated(true);
          
          // Redirect to eatery page
          router.push('/eatery');
        } else if (event === 'SIGNED_OUT') {
          // console.log('User signed out');
          setIsAuthenticated(false);
          // Redirect to signin page when user signs out
          router.push('/auth/signin');
        }
      }
    );

    return () => subscription.unsubscribe();
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