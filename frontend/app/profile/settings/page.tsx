"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import { 
  isSupabaseConfigured, 
  transformSupabaseUser, 
  handleUserLoadError,
  createMockUser,
  type TransformedUser 
} from "@/lib/utils/auth-utils";
import AvatarUpload from "@/components/profile/AvatarUpload";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import { ToastContainer } from "@/components/ui/Toast";
import { LoadingState } from "@/components/ui/LoadingState";

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const [user, setUser] = useState<TransformedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("account");

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {

        // Check if Supabase is configured using centralized utility
        if (!isSupabaseConfigured()) {
          console.warn('Supabase not configured, allowing access for development');
          // For development, create a mock user
          setUser(createMockUser());
          return;
        }
        
        const { data: { user }, error } = await supabaseBrowser.auth.getUser();

        if (user) {
          const userData = transformSupabaseUser(user);

          setUser(userData);
        } else {

        }
      } catch (error) {
        console.error('Error loading user:', error);
        handleUserLoadError(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

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
            <Link
              href="/profile"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Profile
            </Link>
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
              <SecuritySettings user={user} />
            )}
            {activeTab === "notifications" && (
              <NotificationSettings user={user} />
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

function AccountSettings({ user }: { user: TransformedUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabaseBrowser.auth.updateUser({
        data: { full_name: name }
      });

      if (error) {
        throw error;
      }

      setIsEditing(false);
      // Update local state
      setCurrentUser(prev => ({ ...prev, name }));
      // You might want to show a success message here
    } catch (error) {
      console.error("Failed to update profile:", error);
      // You might want to show an error message here
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (avatarUrl: string) => {
    setCurrentUser(prev => ({ ...prev, avatar_url: avatarUrl || null }));
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
        <AvatarUpload
          currentAvatarUrl={currentUser.avatar_url}
          onAvatarChange={handleAvatarChange}
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
          <p className="mt-1 text-sm text-gray-900 capitalize">{currentUser.provider}</p>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ user }: { user: TransformedUser }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        <p className="text-sm text-gray-500">Update your profile details and preferences.</p>
      </div>
      
      <ProfileEditForm />
      
      {/* Public Profile Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Public Profile</h4>
        <p className="text-sm text-blue-700 mb-3">
          Share your profile with others. Your public profile will be available at:
        </p>
        <div className="flex items-center gap-2">
          <code className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
            /u/{user.username || 'your-username'}
          </code>
          {user.username && (
            <Link
              href={`/u/${user.username}`}
              target="_blank"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Profile →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SecuritySettings({ user }: { user: TransformedUser }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security</h3>
        <p className="text-sm text-gray-500">Manage your account security settings.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Password</h4>
            <p className="text-sm text-gray-500">Update your password regularly for security</p>
          </div>
          <button
            onClick={() => window.location.href = "/auth/forgot-password"}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Change Password
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
            <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
          </div>
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Active Sessions</h4>
            <p className="text-sm text-gray-500">Manage your active login sessions</p>
          </div>
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings({ user }: { user: TransformedUser }) {
  const [preferences, setPreferences] = useState({
    specials: true,
    newRestaurants: true,
    menuUpdates: true,
    shabbatReminders: false,
    certificationUpdates: false,
  });

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="text-sm text-gray-500">Choose what notifications you want to receive.</p>
      </div>

      <div className="space-y-4">
        {Object.entries(preferences).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </h4>
              <p className="text-sm text-gray-500">
                {key === 'specials' && 'Get notified about special offers and deals'}
                {key === 'newRestaurants' && 'Be informed when new restaurants are added'}
                {key === 'menuUpdates' && 'Receive updates when restaurant menus change'}
                {key === 'shabbatReminders' && 'Get reminders about Shabbat hours'}
                {key === 'certificationUpdates' && 'Stay updated on kosher certification changes'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}

function PrivacySettings({ user }: { user: TransformedUser }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
        <p className="text-sm text-gray-500">Control your privacy and data settings.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Data Export</h4>
            <p className="text-sm text-gray-500">Download a copy of your personal data</p>
          </div>
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Delete Account</h4>
            <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
          </div>
          <button
            disabled
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}
