/**
 * Custom hook for authentication state management using PostgreSQL authentication
 * Replaces Supabase authentication with PostgreSQL-based system
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { postgresAuth, type AuthUser } from '@/lib/auth/postgres-auth';

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  isAnonymous: boolean;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const router = useRouter();
  const mountedRef = useRef(true);

  const refreshUser = useCallback(async () => {
    try {
      if (postgresAuth.isAuthenticated()) {
        const userProfile = await postgresAuth.getProfile();
        setUser(userProfile);
        setAuthState('authenticated');
        setIsAnonymous(false);
      } else {
        setUser(null);
        setAuthState('unauthenticated');
        setIsAnonymous(false);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      setUser(null);
      setAuthState('unauthenticated');
      setIsAnonymous(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await postgresAuth.signOut();
      setUser(null);
      setAuthState('unauthenticated');
      setIsAnonymous(false);
      router.push('/auth/signin');
    } catch (err) {
      console.error('Sign out failed:', err);
      // Still clear local state even if backend call fails
      setUser(null);
      setAuthState('unauthenticated');
      setIsAnonymous(false);
      router.push('/auth/signin');
    }
  }, [router]);

  const signInAnonymously = useCallback(async () => {
    try {
      // For PostgreSQL auth, we'll redirect to signin page
      // Anonymous sign-in can be implemented later if needed
      router.push('/auth/signin');
    } catch (err) {
      console.error('Anonymous sign-in failed:', err);
      setError(err as Error);
    }
  }, [router]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    user,
    isLoading: authState === 'loading',
    error,
    isAnonymous,
    signOut,
    signInAnonymously,
    refreshUser,
  };
}
