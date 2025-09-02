'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Calendar, 
  Star, 
  MessageSquare, 
  Building2,
  Shield,
  Activity,
  Clock,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  UserX,
  Eye,
  EyeOff
} from 'lucide-react';
import UserActivityDashboard from './UserActivityDashboard';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  provider: string;
  status: 'active' | 'suspended' | 'banned' | 'pending_verification';
  metadata?: {
    location?: {
      city: string;
      country: string;
    };
    preferences?: {
      theme: 'light' | 'dark';
      notifications: boolean;
      language: string;
    };
    stats?: {
      totalReviews: number;
      averageRating: number;
      restaurantsVisited: number;
      accountAge: number; // days
    };
  };
}

interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  description: string;
}

interface UserProfileManagerProps {
  userId: string;
  onClose?: () => void;
  onUserUpdated?: (user: UserProfile) => void;
}

const StatusBadge: React.FC<{ status: UserProfile['status'] }> = ({ status }) => {
  const statusConfig = {
    active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
    suspended: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Suspended' },
    banned: { color: 'bg-red-100 text-red-800', icon: UserX, label: 'Banned' },
    pending_verification: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Pending Verification' }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </div>
  );
};

const EditableField: React.FC<{
  label: string;
  value: string;
  type?: 'text' | 'email' | 'password';
  onSave: (value: string) => void;
  canEdit?: boolean;
}> = ({ label, value, type = 'text', onSave, canEdit = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const displayValue = type === 'password' && !showPassword ? '••••••••' : value;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type={type === 'password' && !showPassword ? 'password' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {type === 'password' && (
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:text-green-800"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-900">{displayValue || '-'}</span>
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-blue-600"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function UserProfileManager({ userId, onClose, onUserUpdated }: UserProfileManagerProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [_availableRoles, _setAvailableRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'security'>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Generate mock user data
  const generateMockUser = useCallback((): UserProfile => {
    const statuses: UserProfile['status'][] = ['active', 'suspended', 'banned', 'pending_verification'];
    const providers = ['google', 'apple', 'email'];
    
    return {
      id: userId,
      email: 'sarah.cohen@example.com',
      name: 'Sarah Cohen',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      isSuperAdmin: Math.random() > 0.8,
      emailVerified: Math.random() > 0.2,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      provider: providers[Math.floor(Math.random() * providers.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      metadata: {
        location: {
          city: 'New York',
          country: 'USA'
        },
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en'
        },
        stats: {
          totalReviews: Math.floor(Math.random() * 100),
          averageRating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0 - 5.0
          restaurantsVisited: Math.floor(Math.random() * 50),
          accountAge: Math.floor((Date.now() - new Date('2023-01-01').getTime()) / (24 * 60 * 60 * 1000))
        }
      }
    };
  }, [userId]);

  const generateMockRoles = (): UserRole[] => {
    return [
      {
        id: 'user',
        name: 'User',
        permissions: ['read:restaurants', 'write:reviews'],
        description: 'Standard user with basic access'
      },
      {
        id: 'moderator',
        name: 'Moderator',
        permissions: ['read:restaurants', 'write:reviews', 'moderate:reviews'],
        description: 'Can moderate user-generated content'
      },
      {
        id: 'admin',
        name: 'Admin',
        permissions: ['read:restaurants', 'write:reviews', 'moderate:reviews', 'manage:users'],
        description: 'Full administrative access'
      }
    ];
  };

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setUser(generateMockUser());
        _setAvailableRoles(generateMockRoles());
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUserData();
    }
  }, [userId, generateMockUser]);

  const handleFieldUpdate = (field: string, value: any) => {
    if (user) {
      const updatedUser = { ...user, [field]: value, updatedAt: new Date().toISOString() };
      setUser(updatedUser);
      onUserUpdated?.(updatedUser);
    }
  };

  const handleStatusChange = (newStatus: UserProfile['status']) => {
    handleFieldUpdate('status', newStatus);
  };

  const handleDeleteUser = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, would call delete API
      // TODO: Implement user deletion API call
      onClose?.();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading user profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">User Not Found</h3>
          <p className="text-gray-500">The requested user could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name || user.email} className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name || user.email}</h2>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <StatusBadge status={user.status} />
                {user.isSuperAdmin && (
                  <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Shield className="h-3 w-3" />
                    <span>Super Admin</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'activity', label: 'Activity', icon: Activity },
            { key: 'security', label: 'Security', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              
              <EditableField
                label="Full Name"
                value={user.name || ''}
                onSave={(value) => handleFieldUpdate('name', value)}
              />
              
              <EditableField
                label="Email Address"
                value={user.email}
                type="email"
                onSave={(value) => handleFieldUpdate('email', value)}
              />

              <div className="py-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Status
                </label>
                <select
                  value={user.status}
                  onChange={(e) => handleStatusChange(e.target.value as UserProfile['status'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                  <option value="pending_verification">Pending Verification</option>
                </select>
              </div>

              <div className="py-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Permissions
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="superAdmin"
                    checked={user.isSuperAdmin}
                    onChange={(e) => handleFieldUpdate('isSuperAdmin', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="superAdmin" className="text-sm text-gray-700">
                    Super Admin Access
                  </label>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Account Statistics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-gray-600">Reviews</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{user.metadata?.stats?.totalReviews || 0}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-gray-600">Avg Rating</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{user.metadata?.stats?.averageRating || 0}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-600">Restaurants</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{user.metadata?.stats?.restaurantsVisited || 0}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <span className="text-sm text-gray-600">Days Active</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{user.metadata?.stats?.accountAge || 0}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created</span>
                  <span className="text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-gray-900">{new Date(user.updatedAt).toLocaleDateString()}</span>
                </div>
                {user.lastLogin && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Login</span>
                    <span className="text-gray-900">{new Date(user.lastLogin).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Provider</span>
                  <span className="text-gray-900 capitalize">{user.provider}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <UserActivityDashboard userId={userId} />
        )}

        {activeTab === 'security' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {user.emailVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Email Verification</p>
                      <p className="text-sm text-gray-600">
                        {user.emailVerified ? 'Email is verified' : 'Email needs verification'}
                      </p>
                    </div>
                  </div>
                  {!user.emailVerified && (
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      Send Verification
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Password</p>
                      <p className="text-sm text-gray-600">Last changed: Unknown</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">
                    Reset Password
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {user.status === 'active' ? (
                      <Unlock className="h-5 w-5 text-green-500" />
                    ) : (
                      <Lock className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Account Access</p>
                      <p className="text-sm text-gray-600">
                        Account is {user.status === 'active' ? 'unlocked' : user.status}
                      </p>
                    </div>
                  </div>
                  {user.status === 'active' && (
                    <button 
                      onClick={() => handleStatusChange('suspended')}
                      className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Suspend Account
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
              <div className="border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900">Delete User Account</p>
                    <p className="text-sm text-red-600">
                      Permanently delete this user account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteUser}
                    className={`px-4 py-2 text-sm rounded transition-colors ${
                      showDeleteConfirm
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'border border-red-300 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    {showDeleteConfirm ? 'Confirm Delete' : 'Delete User'}
                  </button>
                </div>
                {showDeleteConfirm && (
                  <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                    <p className="text-sm text-red-800 font-medium">
                      Are you sure? This will permanently delete {user.name || user.email} and all their data.
                    </p>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}