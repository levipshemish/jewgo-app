import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client-secure';
import { User } from '@supabase/supabase-js';

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export interface UseAuthReturn {
  authState: AuthState;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError) {
        throw authError;
      }
      
      setUser(user);
      setAuthState(user ? 'authenticated' : 'unauthenticated');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Authentication check failed');
      setError(error);
      setAuthState('unauthenticated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error: signOutError } = await supabaseClient.auth.signOut();
      
      if (signOutError) {
        throw signOutError;
      }
      
      setUser(null);
      setAuthState('unauthenticated');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
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

  // Listen for auth state changes
  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event: string, session: { user?: Record<string, unknown> } | null) => {
        if (!isMounted) return;

        try {
          setError(null);
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setUser(session?.user as unknown as User || null);
            setAuthState(session?.user ? 'authenticated' : 'unauthenticated');
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setAuthState('unauthenticated');
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Auth state change error');
          setError(error);
          setAuthState('unauthenticated');
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    authState,
    user,
    isLoading,
    error,
    signOut,
    refreshUser,
  };
}
