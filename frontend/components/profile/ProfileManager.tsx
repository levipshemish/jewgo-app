'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  user_id: string;
  username?: string;
  display_name?: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  avatar_url?: string;
  oauth_provider?: string;
  created_at?: string;
  updated_at?: string;
}

interface OAuthStatus {
  has_oauth: boolean;
  oauth_provider?: string;
  has_password: boolean;
  can_unlink: boolean;
}

export default function ProfileManager() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    location: '',
    website: '',
    phone: ''
  });

  // Username checking
  const [usernameCheck, setUsernameCheck] = useState<{
    username: string;
    is_valid: boolean;
    is_available: boolean;
    can_use: boolean;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    const response = await fetch(`${backendUrl}/api/v5/profile${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall('/me');
      setProfile(data.profile);
      setHasProfile(data.has_profile);
      
      if (data.profile) {
        setFormData({
          username: data.profile.username || '',
          display_name: data.profile.display_name || '',
          bio: data.profile.bio || '',
          location: data.profile.location || '',
          website: data.profile.website || '',
          phone: data.profile.phone || ''
        });
      }
    } catch (err: any) {
      setError(`Failed to load profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const loadOAuthStatus = useCallback(async () => {
    try {
      const data = await apiCall('/oauth/status');
      setOAuthStatus(data.oauth_status);
    } catch (err: any) {
      console.error('Failed to load OAuth status:', err);
    }
  }, [apiCall]);

  useEffect(() => {
    if (isAuthenticated()) {
      loadProfile();
      loadOAuthStatus();
    }
  }, [isAuthenticated, loadProfile, loadOAuthStatus]);

  const checkUsername = async (username: string) => {
    if (!username.trim()) {
      setUsernameCheck(null);
      return;
    }

    try {
      const data = await apiCall('/username/check', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim() })
      });
      setUsernameCheck(data);
    } catch (err: any) {
      console.error('Failed to check username:', err);
    }
  };

  const getSuggestions = async () => {
    try {
      const data = await apiCall('/username/suggestions', {
        method: 'POST',
        body: JSON.stringify({ 
          base_name: user?.name || 'user',
          count: 5
        })
      });
      setSuggestions(data.suggestions);
    } catch (err: any) {
      console.error('Failed to get suggestions:', err);
    }
  };

  const createProfile = async () => {
    try {
      setIsCreating(true);
      setError(null);

      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }
      if (!formData.display_name.trim()) {
        throw new Error('Display name is required');
      }

      await apiCall('/create', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setSuccess('Profile created successfully!');
      await loadProfile();
    } catch (err: any) {
      setError(`Failed to create profile: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const updateProfile = async () => {
    try {
      setIsUpdating(true);
      setError(null);

      await apiCall('/update', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      setSuccess('Profile updated successfully!');
      await loadProfile();
    } catch (err: any) {
      setError(`Failed to update profile: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const linkGoogleAccount = async () => {
    try {
      setError(null);
      const data = await apiCall('/oauth/link-google', {
        method: 'POST'
      });
      
      // Redirect to Google OAuth
      window.location.href = data.auth_url;
    } catch (err: any) {
      setError(`Failed to link Google account: ${err.message}`);
    }
  };

  const unlinkOAuthAccount = async () => {
    if (!confirm('Are you sure you want to unlink your OAuth account? You will need your password to sign in.')) {
      return;
    }

    try {
      setError(null);
      await apiCall('/oauth/unlink', {
        method: 'POST'
      });
      
      setSuccess('OAuth account unlinked successfully!');
      await loadOAuthStatus();
    } catch (err: any) {
      setError(`Failed to unlink OAuth account: ${err.message}`);
    }
  };

  if (!isAuthenticated()) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to manage your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Profile Management</h2>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* OAuth Status */}
      {oauthStatus && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">Account Linking</h3>
          {oauthStatus.has_oauth ? (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-green-600">✓</span> Linked to {oauthStatus.oauth_provider}
              </p>
              {oauthStatus.can_unlink && (
                <button
                  onClick={unlinkOAuthAccount}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Unlink {oauthStatus.oauth_provider} account
                </button>
              )}
              {!oauthStatus.has_password && (
                <p className="text-sm text-yellow-600">
                  ⚠️ Set a password to enable account unlinking
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">No OAuth accounts linked</p>
              <button
                onClick={linkGoogleAccount}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Link Google Account
              </button>
            </div>
          )}
        </div>
      )}

      {/* Profile Form */}
      {!hasProfile ? (
        <div>
          <h3 className="text-lg font-semibold mb-4">Create Your Profile</h3>
          <p className="text-gray-600 mb-4">
            Set up your username and profile information.
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold mb-4">Update Your Profile</h3>
        </div>
      )}

      <div className="space-y-4">
        {/* Username Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username *
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={formData.username}
              onChange={(e) => {
                setFormData({ ...formData, username: e.target.value });
                checkUsername(e.target.value);
              }}
              placeholder="Enter username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {usernameCheck && (
              <div className="text-sm">
                {usernameCheck.can_use ? (
                  <span className="text-green-600">✓ Username available</span>
                ) : (
                  <span className="text-red-600">
                    ✗ {!usernameCheck.is_valid ? 'Invalid format' : 'Username taken'}
                  </span>
                )}
              </div>
            )}
            
            {!suggestions.length && (
              <button
                type="button"
                onClick={getSuggestions}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Get username suggestions
              </button>
            )}
            
            {suggestions.length > 0 && (
              <div className="text-sm">
                <p className="text-gray-600 mb-1">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setFormData({ ...formData, username: suggestion });
                        checkUsername(suggestion);
                      }}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name *
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="Your display name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Your location"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://your-website.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Your phone number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          {!hasProfile ? (
            <button
              onClick={createProfile}
              disabled={isCreating || !formData.username.trim() || !formData.display_name.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating Profile...' : 'Create Profile'}
            </button>
          ) : (
            <button
              onClick={updateProfile}
              disabled={isUpdating}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating Profile...' : 'Update Profile'}
            </button>
          )}
        </div>
      </div>

      {/* Current Profile Info */}
      {profile && (
        <div className="mt-8 p-4 border-t">
          <h4 className="font-semibold mb-2">Current Profile</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Username:</strong> {profile.username || 'Not set'}</p>
            <p><strong>Display Name:</strong> {profile.display_name || 'Not set'}</p>
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Provider:</strong> {profile.oauth_provider || 'Email'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
