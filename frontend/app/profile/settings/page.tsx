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
        if (postgresAuth.isAuthenticated()) {
          const profile = await postgresAuth.getProfile();
          if (profile) {
            // Check if user is a guest user (no email, provider unknown)
            // Guest users should be redirected to sign in for protected pages
            const isGuest = !profile.email || profile.is_guest === true;
            
            if (isGuest) {
              // Guest users should sign in to access settings
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
        }

        // No user found, will show access denied
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      } catch (_error) {
        // console.error('Error loading user:', error);
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
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600">Please sign in to access your settings.</p>
            <Link
              href="/auth/signin"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "account", name: "Account", icon: "👤" },
    { id: "profile", name: "Profile", icon: "📝" },
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
          <p className="mt-1 text-sm text-gray-900 capitalize">{currentUser.provider || 'PostgreSQL'}</p>
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
