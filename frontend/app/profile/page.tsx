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
  const router = useRouter();

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('Profile page: Loading user data...');
        
        // Check if Supabase is configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
            process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
          console.warn('Profile page: Supabase not configured, redirecting to settings');
          router.push('/profile/settings');
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
          router.push('/profile/settings');
        } else {
          console.log('Profile page: No user found, redirecting to signin');
          router.push('/auth/signin');
        }
      } catch (error) {
        console.error('Profile page: Error loading user:', error);
        router.push('/auth/signin');
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
        </div>
      </div>
    </div>
  );
}
