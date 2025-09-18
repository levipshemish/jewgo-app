/* eslint-disable no-console */
"use client";
import { appLogger } from '@/lib/utils/logger';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { postgresAuth } from "@/lib/auth/postgres-auth";
import { type AuthUser } from "@/lib/auth/postgres-auth";
import ClickableAvatarUpload from "@/components/profile/ClickableAvatarUpload";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import ProfileManager from "@/components/profile/ProfileManager";
import { ToastContainer } from "@/components/ui/Toast";
import { SignOutButton } from "@/components/auth";
import { LoadingState } from "@/components/ui/LoadingState";

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("account");
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
        console.log('Profile settings: isAuthenticated check:', isAuth);
        
        // Try to get profile regardless of cookie check, as HttpOnly cookies aren't visible to client
        console.log('Profile settings: Attempting to get profile...');
        
        try {
          const profile = await postgresAuth.getProfile();
          console.log('Profile settings: Profile loaded successfully:', !!profile);
          
          if (profile) {
            // Check if user is a guest user (no email, provider unknown)
            // Guest users should be redirected to sign in for protected pages
            const isGuest = !profile.email || profile.is_guest === true;
            console.log('Profile settings: Is guest user:', isGuest);
            
            if (isGuest) {
              // Guest users should sign in to access settings
              console.log('Profile settings: Redirecting guest user to sign in');
              redirected = true;
              router.push('/auth/signin?redirectTo=/profile/settings');
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
          console.error('Profile settings: Failed to get profile:', profileError);
          // Re-throw to be handled by outer catch block
          throw profileError;
        }

        // No user found, will show access denied
        console.log('Profile settings: No user found, showing access denied');
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        
        // Enhanced error logging for debugging
        if (error && typeof error === 'object') {
          console.error('Profile settings error details:', {
            status: (error as any).status,
            code: (error as any).code,
            message: (error as any).message,
            name: (error as any).name
          });
        }
        
        // Check if it's a service unavailable error (503)
        if (error && typeof error === 'object' && 'status' in error && error.status === 503) {
          // Service unavailable - show error state instead of infinite loading
          console.warn('Auth service unavailable (503), showing error state instead of redirecting');
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        
        // For other errors, redirect to sign in
        console.info('Redirecting to sign in due to auth error');
        redirected = true;
        router.push('/auth/signin?redirectTo=/profile/settings');
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
    return <LoadingState message="Loading settings..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings Unavailable</h1>
            <p className="text-gray-600">Unable to load your profile settings at the moment.</p>
            <div className="mt-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Service Temporarily Unavailable</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>The authentication service is currently experiencing issues. This could be due to:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Backend service maintenance</li>
                        <li>Database connectivity issues</li>
                        <li>Recent deployment in progress</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Sign In Again
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "account", name: "Account", icon: "👤" },
    { id: "profile", name: "Profile", icon: "📝" },
    { id: "username", name: "Username", icon: "🏷️" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "notifications", name: "Notifications", icon: "🔔" },
    { id: "privacy", name: "Privacy", icon: "🛡️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account preferences and security</p>
            </div>
            <div className="flex items-center gap-3">
              <SignOutButton className="inline-flex items-center" redirectTo="/" />
              <Link
                href="/profile"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "account" && (
              <AccountSettings user={user} />
            )}
            {activeTab === "profile" && (
              <ProfileSettings user={user} />
            )}
            {activeTab === "username" && (
              <ProfileManager />
            )}
                          {activeTab === "security" && (
                <SecuritySettings />
              )}
              {activeTab === "notifications" && (
                <NotificationSettings />
              )}
            {activeTab === "privacy" && (
              <PrivacySettings user={user} />
            )}
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

function AccountSettings({ user }: { user: AuthUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.full_name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await postgresAuth.updateUser({
        full_name: name
      });

      setIsEditing(false);
      // Update local state
      setCurrentUser(prev => ({ ...prev, full_name: name }));
      // You might want to show a success message here
    } catch (error) {
      appLogger.error('Failed to update profile', { error: String(error) });
      // You might want to show an error message here
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (_avatarUrl: string) => {
    setCurrentUser(prev => ({ ...prev, avatar_url: _avatarUrl || undefined }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
        <p className="text-sm text-gray-500">Update your basic account information.</p>
      </div>

      {/* Avatar Upload Section */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Profile Picture</h4>
        <ClickableAvatarUpload
          currentAvatarUrl={currentUser.avatar_url}
          onAvatarChange={handleAvatarChange}
          size="lg"
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{currentUser.email}</p>
          <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          {isEditing ? (
            <div className="mt-1 flex space-x-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter your name"
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm text-gray-900">{name || "Not set"}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Authentication Provider</label>
          <p className="mt-1 text-sm text-gray-900 capitalize">
            {currentUser.provider || 'PostgreSQL'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ user }: { user: AuthUser }) {
  return (<div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
          <p className="text-sm text-gray-500">Manage your profile details and preferences.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Name</label>
            <p className="mt-1 text-sm text-gray-900">{user.full_name || "Not set"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <p className="mt-1 text-sm text-gray-900">{user.username || "Not set"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
            <div className="mt-2">
              <ClickableAvatarUpload
                currentAvatarUrl={user.avatar_url}
                onAvatarChange={() => {}}
                size="md"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <ProfileEditForm />
        </div>
      </div>);
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        <p className="text-sm text-gray-500">Manage your account security and authentication.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Change Password</label>
          <p className="mt-1 text-sm text-gray-500">Update your password to keep your account secure.</p>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Change Password
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Two-Factor Authentication</label>
          <p className="mt-1 text-sm text-gray-500">Add an extra layer of security to your account.</p>
          <button className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            Enable 2FA
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="text-sm text-gray-500">Choose how and when you want to be notified.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Email Notifications</label>
            <p className="text-sm text-gray-500">Receive updates via email</p>
          </div>
          <input type="checkbox" className="rounded" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Push Notifications</label>
            <p className="text-sm text-gray-500">Receive updates in real-time</p>
          </div>
          <input type="checkbox" className="rounded" />
        </div>
      </div>
    </div>
  );
}

function PrivacySettings({ user: _user }: { user: AuthUser }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
        <p className="text-sm text-gray-500">Control your privacy and data sharing preferences.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Profile Visibility</label>
          <p className="mt-1 text-sm text-gray-500">Choose who can see your profile information.</p>
          <select className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
            <option>Public</option>
            <option>Friends Only</option>
            <option>Private</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Profile URL</label>
          <p className="mt-1 text-sm text-gray-900">
            /u/{_user.username || 'your-username'}
          </p>
          {_user.username && (
            <p className="mt-1 text-xs text-gray-500">
              <a
                href={`/u/${_user.username}`}
                className="text-blue-600 hover:text-blue-700"
              >
                View your public profile
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
