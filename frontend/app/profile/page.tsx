"use client";

import { useEffect, useState} from "react";
import { appLogger} from '@/lib/utils/logger';
import { useRouter} from "next/navigation";
import Link from "next/link";
import { SignOutButton} from "@/components/auth";
import ClickableAvatarUpload from "@/components/profile/ClickableAvatarUpload";
import { postgresAuth, type AuthUser } from "@/lib/auth/postgres-auth";


// Force dynamic rendering to avoid SSR issues with Supabase client
export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectStatus, setRedirectStatus] = useState<string>('');

  const router = useRouter();

  // Load user data
  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      let redirected = false;
      let userAuthenticated = false;
      try {
        // Check if user is authenticated via PostgreSQL auth
        const isAuth = postgresAuth.isAuthenticated();
        appLogger.info('Profile page: isAuthenticated check:', { isAuth });
        
        // Try to get profile regardless of cookie check, as HttpOnly cookies aren't visible to client
        appLogger.info('Profile page: Attempting to get profile...');
        
        try {
          const profile = await postgresAuth.getProfile();
          appLogger.info('Profile page: Profile loaded successfully:', { hasProfile: !!profile });
          
          if (profile) {
            // Check if user is a guest user (no email, provider unknown)
            // Guest users should be redirected to sign in for protected pages
            const isGuest = !profile.email || profile.is_guest === true;
            appLogger.info('Profile page: Is guest user:', { isGuest });
            
            if (isGuest) {
              // Guest users should sign in to access profile
              appLogger.info('Profile page: Redirecting guest user to sign in');
              setRedirectStatus('Guest users must sign in to access protected pages. Redirecting to /auth/signin...');
              redirected = true;
              router.push('/auth/signin?redirectTo=/profile');
              return;
            }
            
            // User is authenticated with email (not a guest)
            if (isMounted) {
              setUser(profile);
              setIsLoading(false);
              userAuthenticated = true;
            }
            return;
          }
        } catch (profileError) {
          appLogger.error('Profile page: Failed to get profile:', { error: profileError });
          // Re-throw to be handled by outer catch block
          throw profileError;
        }

        // No user found, will redirect to sign in
        appLogger.info('Profile page: No user found, redirecting to sign in');
        setRedirectStatus('Redirecting to /auth/signin...');
        redirected = true;
        router.push('/auth/signin?redirectTo=/profile');
      } catch (error) {
        appLogger.error('Error loading user:', { error });
        
        // Enhanced error logging for debugging
        if (error && typeof error === 'object' && 'status' in error) {
          appLogger.error('Profile page error details:', {
            status: (error as any).status,
            code: (error as any).code,
            message: (error as any).message,
            name: (error as any).name
          });
        }
        
        // Check if it's a service unavailable error (503)
        if (error && typeof error === 'object' && 'status' in error && error.status === 503) {
          // Service unavailable - show error state instead of infinite loading
          appLogger.warn('Auth service unavailable (503), showing error state instead of redirecting');
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        
        // For other errors, redirect to sign in
        appLogger.info('Redirecting to sign in due to auth error');
        setRedirectStatus('Error occurred, redirecting to /auth/signin...');
        redirected = true;
        router.push('/auth/signin?redirectTo=/profile');
      } finally {

        // Only set loading to false if we're not redirecting AND user is not authenticated
        if (isMounted && !userAuthenticated) {
          setIsLoading(!redirected);
        }
      }
    };
    loadUser();
    
    return () => {
      isMounted = false;
    };
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
      <div className="min-h-screen bg-gray-50 py-8 page-with-bottom-nav">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600">Please sign in to view your profile.</p>
            {redirectStatus && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 text-sm">{redirectStatus}</p>
              </div>
            )}
            <div className="mt-6">
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 page-with-bottom-nav">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600">Your account information</p>
            </div>
            {user.avatar_url && (
              <img src={user.avatar_url} alt={user.name || user.email || 'Profile avatar'} className="h-12 w-12 rounded-full object-cover" />
            )}
          </div>

          {/* Avatar Upload Section */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex justify-center">
              <ClickableAvatarUpload 
                currentAvatarUrl={user.avatar_url}
                onAvatarChange={(_avatarUrl) => {
                  setUser(prevUser => prevUser ? { ...prevUser, avatar_url: _avatarUrl } : null);
                }}
                size="xl"
              />
            </div>
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
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Unknown'}
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
                {user.username && (
                  <Link
                    href={`/u/${user.username}`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Public Profile
                  </Link>
                )}
                <SignOutButton
                  redirectTo="/"
                  className="inline-flex items-center"
                />
                <Link
                  href="/specials"
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
/* eslint-disable no-console */
