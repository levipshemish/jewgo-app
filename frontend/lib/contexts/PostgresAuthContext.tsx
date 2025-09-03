'use client';

/**
 * PostgreSQL Authentication Context
 * 
 * React context for managing authentication state with PostgreSQL backend.
 * This replaces the Supabase authentication context.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { postgresAuth, AuthUser, PostgresAuthError } from '@/lib/auth/postgres-auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  
  // Authentication actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  
  // Profile actions
  updateProfile: (data: { name: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Role checks
  hasRole: (roleName: string) => boolean;
  hasMinimumRoleLevel: (level: number) => boolean;
  isAdmin: () => boolean;
  isModerator: () => boolean;
  
  // Utilities
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load user profile and validate authentication
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      // Check if user is authenticated
      if (!postgresAuth.isAuthenticated()) {
        setUser(null);
        return;
      }

      // Get user profile
      const profile = await postgresAuth.getProfile();
      setUser(profile);
    } catch (err) {
      console.error('Failed to load user:', err);
      
      if (err instanceof PostgresAuthError && err.status === 401) {
        // Token is invalid, clear auth state
        setUser(null);
        try {
          await postgresAuth.logout();
        } catch (logoutErr) {
          console.warn('Logout after auth failure failed:', logoutErr);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      }
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      clearError();

      const result = await postgresAuth.login({ email, password });
      setUser(result.user);
    } catch (err) {
      const message = err instanceof PostgresAuthError 
        ? err.message 
        : 'Login failed';
      setError(message);
      throw err; // Re-throw for component error handling
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Register function
  const register = useCallback(async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      clearError();

      await postgresAuth.register({ email, password, name });
      // Note: User needs to verify email before they can login
    } catch (err) {
      const message = err instanceof PostgresAuthError 
        ? err.message 
        : 'Registration failed';
      setError(message);
      throw err; // Re-throw for component error handling
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      await postgresAuth.logout();
      setUser(null);
    } catch (err) {
      console.warn('Logout failed:', err);
      // Always clear user state even if logout request fails
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Refresh authentication
  const refreshAuth = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  // Update profile
  const updateProfile = useCallback(async (data: { name: string }) => {
    try {
      clearError();
      await postgresAuth.updateProfile(data);
      
      // Refresh user data
      await loadUser();
    } catch (err) {
      const message = err instanceof PostgresAuthError 
        ? err.message 
        : 'Failed to update profile';
      setError(message);
      throw err;
    }
  }, [clearError, loadUser]);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      clearError();
      await postgresAuth.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
    } catch (err) {
      const message = err instanceof PostgresAuthError 
        ? err.message 
        : 'Failed to change password';
      setError(message);
      throw err;
    }
  }, [clearError]);

  // Role checking functions
  const hasRole = useCallback((roleName: string): boolean => {
    if (!user) return false;
    return user.roles.some(role => role.role === roleName);
  }, [user]);

  const hasMinimumRoleLevel = useCallback((level: number): boolean => {
    if (!user) return false;
    const maxLevel = Math.max(...user.roles.map(role => role.level), 0);
    return maxLevel >= level;
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return hasMinimumRoleLevel(10); // Admin level is 10
  }, [hasMinimumRoleLevel]);

  const isModerator = useCallback((): boolean => {
    return hasMinimumRoleLevel(5); // Moderator level is 5
  }, [hasMinimumRoleLevel]);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Set up token refresh interval
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        if (postgresAuth.isAuthenticated()) {
          await postgresAuth.refreshAccessToken();
        } else {
          // Token expired, clear user state
          setUser(null);
        }
      } catch (err) {
        console.warn('Token refresh failed:', err);
        // If refresh fails, user will need to login again
        setUser(null);
      }
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Listen for storage changes (multi-tab logout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_access_token' && !e.newValue) {
        // Access token was removed, logout user
        setUser(null);
        setError(null);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refreshAuth,
    updateProfile,
    changePassword,
    hasRole,
    hasMinimumRoleLevel,
    isAdmin,
    isModerator,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!user) {
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
      return null;
    }
    
    return <Component {...props} />;
  };
}

// HOC for admin routes
export function withAdminAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AdminAuthenticatedComponent(props: P) {
    const { user, loading, isAdmin } = useAuth();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!user) {
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
      return null;
    }
    
    if (!isAdmin()) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}

// Hook for conditional rendering based on roles
export function useRoleGuard() {
  const { hasRole, hasMinimumRoleLevel, isAdmin, isModerator } = useAuth();
  
  return {
    canAccess: (requirement: string | number | { role: string } | { level: number }) => {
      if (typeof requirement === 'string') {
        return hasRole(requirement);
      } else if (typeof requirement === 'number') {
        return hasMinimumRoleLevel(requirement);
      } else if ('role' in requirement) {
        return hasRole(requirement.role);
      } else if ('level' in requirement) {
        return hasMinimumRoleLevel(requirement.level);
      }
      return false;
    },
    isAdmin,
    isModerator,
  };
}
