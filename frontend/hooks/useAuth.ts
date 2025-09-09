/**
 * Custom hook for authentication state management using PostgreSQL authentication
 * Replaces Supabase authentication with PostgreSQL-based system
 */

import { useState, useCallback, useEffect } from 'react';
import { postgresAuth, type AuthUser } from '@/lib/auth/postgres-auth';

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  loading: boolean; // Legacy alias for backward compatibility
  error: Error | null;
  isAnonymous: boolean;
  isAuthenticated: boolean; // Legacy property for backward compatibility
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if user is authenticated via PostgreSQL auth
      if (postgresAuth.isAuthenticated()) {
        const authUser = await postgresAuth.getProfile();
        setUser(authUser);
        setAuthState('authenticated');
      } else {
        setUser(null);
        setAuthState('unauthenticated');
      }
    } catch (err) {
      const authError = err instanceof Error ? err : new Error('Authentication check failed');
      setError(authError);
      setAuthState('unauthenticated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await postgresAuth.logout();
      
      setUser(null);
      setAuthState('unauthenticated');
    } catch (err) {
      const signOutError = err instanceof Error ? err : new Error('Sign out failed');
      setError(signOutError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Check for token expiration and refresh if needed
  useEffect(() => {
    if (authState === 'authenticated') {
      const checkTokenExpiry = () => {
        if (!postgresAuth.isAuthenticated()) {
          // Token expired, refresh user state
          checkAuth();
        }
      };

      // Check every 5 minutes
      const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [authState, checkAuth]);

  // Anonymous sign-in functionality (if needed)
  const signInAnonymously = useCallback(async () => {
    // PostgreSQL auth doesn't support anonymous users by default
    // This could be implemented as a guest user with limited permissions
    console.warn('Anonymous sign-in not supported in PostgreSQL auth system');
    throw new Error('Anonymous sign-in not supported');
  }, []);

  return {
    user,
    isLoading,
    loading: isLoading, // Legacy alias for backward compatibility
    error,
    isAnonymous: false, // PostgreSQL auth doesn't support anonymous users
    isAuthenticated: authState === 'authenticated', // Legacy property for backward compatibility
    signOut,
    signInAnonymously,
    refreshUser,
  };
}
