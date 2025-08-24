"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { 
  isSupabaseConfigured, 
  transformSupabaseUser, 
  handleUserLoadError,
  type TransformedUser 
} from "@/lib/utils/auth-utils-client";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ProfilePage() {
  const [user, setUser] = useState<TransformedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectStatus, setRedirectStatus] = useState<string>('');
  const router = useRouter();

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {

        // Check if Supabase is configured using centralized utility
        if (!isSupabaseConfigured()) {
          console.warn('Profile page: Supabase not configured, redirecting to settings');

          setRedirectStatus('Supabase not configured, redirecting to settings...');
          // Remove unnecessary delay - redirect immediately
          router.push('/profile/settings');
          return;
        }
        
        const { data: { user }, error } = await supabaseBrowser.auth.getUser();

        if (user) {
          const userData = transformSupabaseUser(user);

          setUser(userData);
          
          // Redirect to settings page immediately

          setRedirectStatus('Redirecting to /profile/settings...');
          router.push('/profile/settings');
        } else {

          setRedirectStatus('Redirecting to /auth/signin...');
          router.push('/auth/signin');
        }
      } catch (error) {
        console.error('Profile page: Error loading user:', error);

        setRedirectStatus('Error occurred, redirecting to /auth/signin...');
        handleUserLoadError(error, router);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [router]);

  if (isLoading) {
    return <LoadingState message="Loading profile..." />;
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
