"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering to avoid SSR issues with Supabase client
export const dynamic = 'force-dynamic';

import { 
  handleUserLoadError,
  type TransformedUser 
} from "@/lib/utils/auth-utils-client";

export default function ProfilePage() {
  const [user, setUser] = useState<TransformedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectStatus, setRedirectStatus] = useState<string>('');
  const router = useRouter();

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('Profile page: Starting to load user data...');
        
        // Use server-side API to get user data instead of client-side Supabase
        const response = await fetch('/api/auth/sync-user', {
          method: 'GET',
          credentials: 'include',
        });

        console.log('Profile page: Response status:', response.status);

        if (response.ok) {
          const userData = await response.json();
          console.log('Profile page: User data received:', userData);
          
          if (userData.user) {
            // Check if user is a guest user (no email, provider unknown)
            // Guest users should be redirected to sign in for protected pages
            console.log('Profile page: Checking if user is a guest...');
            console.log('Profile page: user.email:', userData.user.email);
            console.log('Profile page: user.provider:', userData.user.provider);
            
            const isGuest = !userData.user.email && userData.user.provider === 'unknown';
            console.log('Profile page: isGuest:', isGuest);
            
            if (isGuest) {
              console.log('Profile page: User is a guest, redirecting to signin');
              setRedirectStatus('Guest users must sign in to access protected pages. Redirecting to /auth/signin...');
              router.push('/auth/signin');
              return;
            }
            
            // User is authenticated with email (not a guest)
            console.log('Profile page: User is authenticated with email, setting user data');
            setUser(userData.user);
            setIsLoading(false);
            return;
          } else {
            console.log('Profile page: No user data in response');
          }
        } else if (response.status === 401) {
          console.log('Profile page: User is not authenticated (401)');
          // User is not authenticated
          setRedirectStatus('Redirecting to /auth/signin...');
          router.push('/auth/signin');
          return;
        } else {
          console.log('Profile page: Response not ok, status:', response.status);
        }

        // If no user data, redirect to signin
        console.log('Profile page: No user data, redirecting to signin');
        setRedirectStatus('Redirecting to /auth/signin...');
        router.push('/auth/signin');
      } catch (_error) {
        console.log('Profile page: Error occurred:', _error);
        setRedirectStatus('Error occurred, redirecting to /auth/signin...');
        handleUserLoadError(_error, router);
      } finally {
        console.log('Profile page: Setting loading to false');
        setIsLoading(false);
      }
    };
    loadUser();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Loading Profile...</h1>
            <p className="text-gray-600">Loading profile data...</p>
            {redirectStatus && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 text-sm">{redirectStatus}</p>
              </div>
            )}
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-gray-600 text-sm">Loading: {isLoading ? 'Yes' : 'No'}</p>
              <p className="text-gray-600 text-sm">User: {user ? 'Yes' : 'No'}</p>
              <p className="text-gray-600 text-sm">Redirect Status: {redirectStatus || 'None'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600">Please sign in to view your profile.</p>
            {redirectStatus && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 text-sm">{redirectStatus}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600">Your account information</p>
          </div>

          {/* Profile Content */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.name || 'Not provided'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <p className="mt-1 text-sm text-gray-900">{user.username || 'Not provided'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{user.provider || 'Unknown'}</p>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono text-xs">{user.id}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/profile/settings"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Profile Settings
                </Link>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
                      router.push('/');
                    } catch (e) {
                      console.error('Sign out failed', e);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign Out
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
