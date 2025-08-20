import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabaseBrowser } from '@/lib/supabase/client';
import { 
  transformSupabaseUser, 
  isSupabaseConfigured, 
  handleUserLoadError, 
  createMockUser,
  type TransformedUser 
} from '@/lib/utils/auth-utils';

/**
 * Custom hook for authentication state management
 * Eliminates duplicated user loading logic across components
 */
export function useAuth() {
  const [user, setUser] = useState<TransformedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          console.warn('Supabase not configured, using mock user for development');
          setUser(createMockUser());
          setIsLoading(false);
          return;
        }

        // Load user from Supabase
        const { data: { user }, error } = await supabaseBrowser.auth.getUser();
        
        if (user) {
          const transformedUser = transformSupabaseUser(user);
          setUser(transformedUser);
          setError(null);
        } else if (error) {
          setError(error.message);
          handleUserLoadError(error, router);
        } else {
          setUser(null);
          setError(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load user';
        setError(errorMessage);
        handleUserLoadError(err, router);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, [router]);

  const signOut = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      setUser(null);
      setError(null);
      router.push('/');
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out');
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error } = await supabaseBrowser.auth.getUser();
      
      if (user) {
        setUser(transformSupabaseUser(user));
        setError(null);
      } else if (error) {
        setError(error.message);
      } else {
        setUser(null);
      }
    } catch (err) {
      setError('Failed to refresh user');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    error,
    signOut,
    refreshUser,
    isAuthenticated: !!user
  };
}
