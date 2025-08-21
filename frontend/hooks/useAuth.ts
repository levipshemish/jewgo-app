import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabaseBrowser } from '@/lib/supabase/client';
import { 
  transformSupabaseUser, 
  isSupabaseConfigured, 
  handleUserLoadError, 
  createMockUser,
  validateSupabaseFeatureSupport,
  verifyTokenRotation,
  extractIsAnonymous,
  type TransformedUser 
} from '@/lib/utils/auth-utils';

/**
 * Custom hook for authentication state management
 * Eliminates duplicated user loading logic across components
 * Includes feature support validation and token rotation verification
 */
export function useAuth() {
  const [user, setUser] = useState<TransformedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Boot-time feature support validation
        if (!validateSupabaseFeatureSupport()) {
          console.error('Supabase feature support validation failed');
          setError('Application configuration error');
          setIsLoading(false);
          return;
        }

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
          setIsAnonymous(extractIsAnonymous(user));
          setError(null);
        } else if (error) {
          setError(error.message);
          handleUserLoadError(error, router);
        } else {
          setUser(null);
          setIsAnonymous(false);
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
      setIsAnonymous(false);
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
        const transformedUser = transformSupabaseUser(user);
        setUser(transformedUser);
        setIsAnonymous(extractIsAnonymous(user));
        setError(null);
      } else if (error) {
        setError(error.message);
      } else {
        setUser(null);
        setIsAnonymous(false);
      }
    } catch (err) {
      setError('Failed to refresh user');
    } finally {
      setIsLoading(false);
    }
  };

  const signInAnonymously = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabaseBrowser.auth.signInAnonymously();
      
      if (error) {
        setError(error.message);
        return { error: error.message };
      }

      if (data.user) {
        const transformedUser = transformSupabaseUser(data.user);
        setUser(transformedUser);
        setIsAnonymous(true);
        return { user: transformedUser };
      }

      setError('Failed to create anonymous session');
      return { error: 'Failed to create anonymous session' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Anonymous sign-in failed';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeToEmailAuth = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Store pre-upgrade tokens for rotation verification
      const { data: { session: preUpgradeSession } } = await supabaseBrowser.auth.getSession();
      
      if (!preUpgradeSession) {
        setError('No active session found');
        return { error: 'No active session found' };
      }

      // Attempt to update user with email
      const { data, error } = await supabaseBrowser.auth.updateUser({ email });
      
      if (error) {
        if (error.message.includes('EMAIL_IN_USE')) {
          // Email conflict - prepare for merge
          const mergeResponse = await fetch('/api/auth/prepare-merge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (mergeResponse.ok) {
            return { 
              needsMerge: true, 
              message: 'This email is already registered. Please sign in to merge your accounts.' 
            };
          } else {
            setError('Failed to prepare account merge');
            return { error: 'Failed to prepare account merge' };
          }
        } else {
          setError(error.message);
          return { error: error.message };
        }
      }

      // Email update successful - verify token rotation
      const tokenRotationVerified = await new Promise<boolean>((resolve) => {
        const unsubscribe = supabaseBrowser.auth.onAuthStateChange(async (event: any, session: any) => {
          if (event === 'TOKEN_REFRESHED' && session) {
            unsubscribe();
            
            // Verify token rotation
            const rotationValid = verifyTokenRotation(preUpgradeSession, session);
            
            if (!rotationValid) {
              console.warn('Token rotation failed, forcing re-authentication');
              // Force signOut -> signIn cycle
              await supabaseBrowser.auth.signOut();
              // User will need to sign in again
              resolve(false);
            } else {
              resolve(true);
            }
          }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, 10000);
      });

      if (!tokenRotationVerified) {
        setError('Authentication refresh required');
        return { error: 'Authentication refresh required' };
      }

      // Update user state
      if (data.user) {
        const transformedUser = transformSupabaseUser(data.user);
        setUser(transformedUser);
        setIsAnonymous(false);
        return { user: transformedUser };
      }

      setError('Failed to upgrade account');
      return { error: 'Failed to upgrade account' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Account upgrade failed';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const mergeAnonymousAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/merge-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Merge failed');
        return { error: result.error || 'Merge failed' };
      }

      // Refresh user state after merge
      await refreshUser();
      
      return { 
        success: true, 
        moved: result.moved || [],
        correlation_id: result.correlation_id 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Account merge failed';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Derived authentication states
  const isAuthenticated = !!user;
  const isFullyAuthenticated = !!user && !isAnonymous;
  const canWrite = isFullyAuthenticated;

  return {
    user,
    isLoading,
    error,
    isAnonymous,
    isAuthenticated,
    isFullyAuthenticated,
    canWrite,
    signOut,
    refreshUser,
    signInAnonymously,
    upgradeToEmailAuth,
    mergeAnonymousAccount
  };
}
