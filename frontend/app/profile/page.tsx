"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";

interface User {
  id: string;
  email: string | undefined;
  name?: string;
  provider: string;
  avatar_url?: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectStatus, setRedirectStatus] = useState<string>('');
  const router = useRouter();

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('Profile page: Loading user data...');
        console.log('Profile page: Current URL:', window.location.href);
        
        // Check if Supabase is configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
            process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
          console.warn('Profile page: Supabase not configured, redirecting to settings');
          console.log('Profile page: About to redirect to /profile/settings');
          setRedirectStatus('Supabase not configured, redirecting to settings...');
          setTimeout(() => {
            router.push('/profile/settings');
          }, 1000); // Add a delay to see the status
          return;
        }
        
        const { data: { user }, error } = await supabaseBrowser.auth.getUser();
        console.log('Profile page: User load result:', { user, error });
        
        if (user) {
          const userData = {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            provider: 'supabase',
            avatar_url: user.user_metadata?.avatar_url || null
          };
          console.log('Profile page: Setting user data:', userData);
          setUser(userData);
          
          // Redirect to settings page
          console.log('Profile page: About to redirect to /profile/settings');
          setRedirectStatus('Redirecting to /profile/settings...');
          setTimeout(() => {
            router.push('/profile/settings');
          }, 1000); // Add a delay to see the status
        } else {
          console.log('Profile page: No user found, redirecting to signin');
          console.log('Profile page: About to redirect to /auth/signin');
          setRedirectStatus('Redirecting to /auth/signin...');
          setTimeout(() => {
            router.push('/auth/signin');
          }, 1000); // Add a delay to see the status
        }
              } catch (error) {
          console.error('Profile page: Error loading user:', error);
          console.log('Profile page: About to redirect to /auth/signin due to error');
          setRedirectStatus('Error occurred, redirecting to /auth/signin...');
          setTimeout(() => {
            router.push('/auth/signin');
          }, 1000); // Add a delay to see the status
        } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached due to redirects above
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loading Profile...</h1>
          <p className="text-gray-600">Redirecting to profile settings...</p>
          {redirectStatus && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm">{redirectStatus}</p>
            </div>
          )}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-gray-600 text-sm">Current URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
            <p className="text-gray-600 text-sm">User: {user ? user.email : 'None'}</p>
            <p className="text-gray-600 text-sm">Loading: {isLoading ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
