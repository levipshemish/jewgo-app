'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserApi } from '@/lib/api/user-api';

interface UserProfileData {
  id: string;
  email: string;
  role: string;
  user_metadata: {
    display_name?: string;
    avatar_url?: string;
    preferences?: any;
    phone?: string;
  };
  created_at: number;
}

export default function UserProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const userApi = useUserApi();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
  });

  // Load user profile
  useEffect(() => {
    if (user && !authLoading) {
      loadProfile();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const profileData = await userApi.profile.get() as any;
      setProfile(profileData);
      setFormData({
        display_name: profileData.user_metadata?.display_name || '',
        phone: profileData.user_metadata?.phone || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await userApi.profile.update({
        display_name: formData.display_name,
        phone: formData.phone,
      });
      
      // Reload profile to get updated data
      await loadProfile();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        display_name: profile.user_metadata?.display_name || '',
        phone: profile.user_metadata?.phone || '',
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <p className="text-gray-600 text-center">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">User Profile</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ) : profile ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-900">{profile.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <p className="text-gray-900 capitalize">{profile.role}</p>
          </div>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your display name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your phone number"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <p className="text-gray-900">
                  {profile.user_metadata?.display_name || 'Not set'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <p className="text-gray-900">
                  {profile.user_metadata?.phone || 'Not set'}
                </p>
              </div>
              
              <button
                onClick={() => setIsEditing(true)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit Profile
              </button>
            </div>
          )}
          
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Member since: {new Date(profile.created_at * 1000).toLocaleDateString()}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-gray-600 text-center">No profile data available.</p>
      )}
    </div>
  );
}
