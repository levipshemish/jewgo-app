import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { supabaseBrowser } from '@/lib/supabase/client';
import { 
  transformSupabaseUser, 
  isSupabaseConfigured, 
  handleUserLoadError, 
  createMockUser,
  verifyTokenRotation,
  extractIsAnonymous,
  type TransformedUser,
  extractJtiFromToken
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
  
  // Guard against concurrent anonymous signin calls
  const isStartingAnonRef = useRef(false);

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

  const signInAnonymously = async (turnstileToken?: string) => {
    // Prevent multiple simultaneous calls
    if (isStartingAnonRef.current) {
      return { error: 'Sign-in already in progress' };
    }
    
    isStartingAnonRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Check for existing anonymous session before calling API
      const { data: { user }, error: getUserError } = await supabaseBrowser.auth.getUser();
      
      if (!getUserError && user && extractIsAnonymous(user)) {
        const transformedUser = transformSupabaseUser(user);
        setUser(transformedUser);
        setIsAnonymous(true);
        return { user: transformedUser };
      }

      // Call the secure server endpoint that enforces Turnstile and rate limiting
      const response = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ turnstileToken: turnstileToken || null })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        const message = result?.error || 'Anonymous sign-in failed';
        setError(message);
        return { error: message };
      }

      // Success - fetch current user from Supabase and update state
      const { data: { user: newUser } } = await supabaseBrowser.auth.getUser();
      if (newUser) {
        const transformedUser = transformSupabaseUser(newUser);
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
      isStartingAnonRef.current = false;
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

      // Call server endpoint for email upgrade with normalized error codes
      // CSRF token for server validation
      let csrfToken: string | undefined;
      try {
        const csrfRes = await fetch('/api/auth/csrf', { method: 'GET', credentials: 'include' });
        const csrfJson = await csrfRes.json();
        csrfToken = csrfJson?.token;
      } catch {}

      const response = await fetch('/api/auth/upgrade-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle normalized error codes
        switch (result.error) {
          case 'EMAIL_IN_USE':
            // Email conflict - prepare for merge
            const mergeResponse = await fetch('/api/auth/prepare-merge', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
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
          case 'INVALID_EMAIL':
            setError('Invalid email format');
            return { error: 'Invalid email format' };
          case 'AUTHENTICATION_ERROR':
            setError('Authentication required');
            return { error: 'Authentication required' };
          case 'REQUIRES_REAUTH':
            setError('Authentication refresh required');
            return { error: 'Authentication refresh required', requires_reauth: true };
          case 'RATE_LIMITED':
            setError('Too many attempts. Please try again later.');
            return { error: 'Too many attempts. Please try again later.' };
          default:
            setError(result.details || 'Email upgrade failed');
            return { error: result.details || 'Email upgrade failed' };
        }
      }

      // Email update successful - verify token rotation
      const tokenRotationVerified = await new Promise<boolean>((resolve) => {
        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event: any, session: any) => {
          if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'SIGNED_IN') && session) {
            subscription.unsubscribe();
            
            // Verify token rotation
            const rotationValid = verifyTokenRotation(preUpgradeSession, session);
            
            if (!rotationValid) {
              console.warn('Token rotation failed, forcing re-authentication');
              // Force signOut -> signIn cycle
              await supabaseBrowser.auth.signOut();
              
              // Programmatically navigate to signin with redirectTo
              const currentPath = window.location.pathname + window.location.search;
              router.push(`/auth/signin?redirectTo=${encodeURIComponent(currentPath)}`);
              
              // Add small backoff before suggesting re-authentication
              setTimeout(() => {
                // Surface toast suggesting user sign in again
                if (typeof window !== 'undefined' && (window as any).toast) {
                  (window as any).toast({
                    title: 'Authentication Required',
                    description: 'Please sign in again to continue.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                  });
                }
                
                // Log correlation ID via observability helper
                console.log('Token rotation verification failed - user needs to re-authenticate', {
                  correlationId: `token_rotation_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                  timestamp: new Date().toISOString()
                });
              }, 500); // 500ms backoff
              
              resolve(false);
            } else {
              resolve(true);
            }
          }
        });
        
        // Timeout after 10 seconds - fetch session and compare manually
        setTimeout(async () => {
          subscription.unsubscribe();
          
          try {
            const { data: { session: currentSession } } = await supabaseBrowser.auth.getSession();
            
            if (currentSession) {
              // Compare refresh_token and JWT jti to detect rotation
              const refreshTokenChanged = preUpgradeSession.refresh_token !== currentSession.refresh_token;
              const jtiChanged = extractJtiFromToken(preUpgradeSession.access_token) !== extractJtiFromToken(currentSession.access_token);
              
              if (refreshTokenChanged || jtiChanged) {
                resolve(true); // Token rotation detected
              } else {
                console.warn('No token rotation detected within timeout - forcing re-authentication');
                
                // Force signOut and suggest re-authentication
                await supabaseBrowser.auth.signOut();
                
                // Programmatically navigate to signin with redirectTo
                const currentPath = window.location.pathname + window.location.search;
                router.push(`/auth/signin?redirectTo=${encodeURIComponent(currentPath)}`);
                
                // Add small backoff before suggesting re-authentication
                setTimeout(() => {
                  // Surface toast suggesting user sign in again
                  if (typeof window !== 'undefined' && (window as any).toast) {
                    (window as any).toast({
                      title: 'Authentication Required',
                      description: 'Please sign in again to continue.',
                      status: 'warning',
                      duration: 5000,
                      isClosable: true,
                    });
                  }
                  
                  // Log correlation ID via observability helper
                  console.log('Token rotation timeout - user needs to re-authenticate', {
                    correlationId: `token_rotation_timeout_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                    timestamp: new Date().toISOString()
                  });
                }, 500); // 500ms backoff
                
                resolve(false);
              }
            } else {
              resolve(false);
            }
          } catch (error) {
            console.error('Error checking token rotation during timeout:', error);
            resolve(false);
          }
        }, 10000);
      });

      if (!tokenRotationVerified) {
        setError('Authentication refresh required');
        return { error: 'Authentication refresh required' };
      }

      // Refresh user data after successful upgrade
      await refreshUser();
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email upgrade failed';
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

      // CSRF token for server validation
      let csrfToken: string | undefined;
      try {
        const csrfRes = await fetch('/api/auth/csrf', { method: 'GET', credentials: 'include' });
        const csrfJson = await csrfRes.json();
        csrfToken = csrfJson?.token;
      } catch {}

      const response = await fetch('/api/auth/merge-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
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
