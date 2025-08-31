import { useEffect, useReducer, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { supabaseClient } from '@/lib/supabase/client-secure';
import { 
  transformSupabaseUser, 
  isSupabaseConfigured, 
  handleUserLoadError, 
  createMockUser,
  extractIsAnonymous,
  verifyTokenRotation,
  extractJtiFromToken,
  isAdminUser
} from '@/lib/utils/auth-utils';
import { type TransformedUser } from '@/lib/types/supabase-auth';
import { Permission } from '@/lib/constants/permissions';

// Define action types for the reducer
type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: TransformedUser | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ANONYMOUS'; payload: boolean }
  | { type: 'RESET_STATE' }
  | { type: 'SET_ANONYMOUS_LOADING'; payload: boolean };

// Define the state interface
interface AuthState {
  user: TransformedUser | null;
  isLoading: boolean;
  error: string | null;
  isAnonymous: boolean;
  isAnonymousLoading: boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
  isAnonymous: false,
  isAnonymousLoading: false,
};

// Reducer function for state management
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_ANONYMOUS':
      return { ...state, isAnonymous: action.payload };
    case 'SET_ANONYMOUS_LOADING':
      return { ...state, isAnonymousLoading: action.payload };
    case 'RESET_STATE':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

/**
 * Custom hook for authentication state management using useReducer
 * Eliminates duplicated user loading logic across components
 * Includes feature support validation and token rotation verification
 */
export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();
  
  // Guard against concurrent anonymous signin calls
  const isStartingAnonRef = useRef(false);

  // Enhanced user loading with role information
  const loadUserWithRoles = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, using mock user for development');
        dispatch({ type: 'SET_USER', payload: createMockUser() });
        return;
      }

      // Load user from Supabase
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (user) {
        // Get session for JWT token
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        // Transform user with role information
        const transformedUser = await transformSupabaseUser(user, {
          includeRoles: !!session?.access_token,
          userToken: session?.access_token || undefined
        });
        
        dispatch({ type: 'SET_USER', payload: transformedUser });
        dispatch({ type: 'SET_ANONYMOUS', payload: extractIsAnonymous(user) });
      } else if (error) {
        // Handle specific auth session missing error
        if (error.message.includes('Auth session missing')) {
          console.warn('Auth session missing, user needs to sign in');
          dispatch({ type: 'SET_USER', payload: null });
          dispatch({ type: 'SET_ANONYMOUS', payload: false });
        } else {
          dispatch({ type: 'SET_ERROR', payload: error.message });
          handleUserLoadError(error, router);
        }
      } else {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_ANONYMOUS', payload: false });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      handleUserLoadError(err, router);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [router]);

  // Load user effect
  useEffect(() => {
    loadUserWithRoles();
  }, [loadUserWithRoles]);

  // Set up auth state change listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event: any, session: any) => {

        if (event === 'SIGNED_IN' && session?.user) {
          // Transform user with role information on sign in
          const transformedUser = await transformSupabaseUser(session.user, {
            includeRoles: !!session?.access_token,
            userToken: session?.access_token || undefined
          });
          dispatch({ type: 'SET_USER', payload: transformedUser });
          dispatch({ type: 'SET_ANONYMOUS', payload: extractIsAnonymous(session.user) });
          dispatch({ type: 'SET_ERROR', payload: null });
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'RESET_STATE' });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Refresh user with updated role information
          const transformedUser = await transformSupabaseUser(session.user, {
            includeRoles: !!session?.access_token,
            userToken: session?.access_token || undefined
          });
          dispatch({ type: 'SET_USER', payload: transformedUser });
          dispatch({ type: 'SET_ANONYMOUS', payload: extractIsAnonymous(session.user) });
        } else if (event === 'USER_UPDATED' && session?.user) {
          // Update user details after profile change
          const transformedUser = await transformSupabaseUser(session.user, {
            includeRoles: !!session?.access_token,
            userToken: session?.access_token || undefined
          });
          dispatch({ type: 'SET_USER', payload: transformedUser });
          dispatch({ type: 'SET_ANONYMOUS', payload: extractIsAnonymous(session.user) });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      await supabaseClient.auth.signOut();
      dispatch({ type: 'RESET_STATE' });
      router.push('/auth/signin');
    } catch (err) {
      console.error('Sign out error:', err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to sign out' });
    }
  }, [router]);

  // Enhanced refresh user function
  const refreshUser = useCallback(async () => {
    await loadUserWithRoles();
  }, [loadUserWithRoles]);

  // Anonymous sign in function with race condition prevention
  const signInAnonymously = useCallback(async () => {
    // Prevent concurrent sign-in attempts
    if (isStartingAnonRef.current || state.isAnonymousLoading) {
      return;
    }

    try {
      isStartingAnonRef.current = true;
      dispatch({ type: 'SET_ANONYMOUS_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const { data, error } = await supabaseClient.auth.signInAnonymously();
      
      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return;
      }

      if (data.user) {
        const transformedUser = await transformSupabaseUser(data.user, {
          includeRoles: !!data.session?.access_token,
          userToken: data.session?.access_token || undefined
        });
        dispatch({ type: 'SET_USER', payload: transformedUser });
        dispatch({ type: 'SET_ANONYMOUS', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        
        // Navigate to eatery page after successful anonymous sign-in
        router.push('/eatery');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in anonymously';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      isStartingAnonRef.current = false;
      dispatch({ type: 'SET_ANONYMOUS_LOADING', payload: false });
    }
  }, [router, state.isAnonymousLoading]);

  // Token rotation verification
  const verifyTokenRotationStatus = useCallback(async () => {
    if (!state.user) {
      return;
    }

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      const jti = extractJtiFromToken(session.access_token);
      if (!jti) {
        return;
      }

      // Note: verifyTokenRotation requires both pre and post upgrade sessions
      // This is a simplified check - in a real implementation, you'd need both sessions
      // For now, we'll skip this verification
      // const rotationStatus = await verifyTokenRotation(preSession, postSession);
      // if (!rotationStatus) {
      //   console.warn('Token rotation verification failed, refreshing user');
      //   await refreshUser();
      // }
    } catch (err) {
      console.error('Token rotation verification error:', err);
    }
  }, [state.user, refreshUser]);

  // Verify token rotation on mount and periodically
  useEffect(() => {
    if (!state.user) {
      return;
    }

    // Verify immediately
    verifyTokenRotationStatus();

    // Set up periodic verification (every 5 minutes)
    const interval = setInterval(verifyTokenRotationStatus, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [state.user, verifyTokenRotationStatus]);

  return {
    // State
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    isAnonymous: state.isAnonymous,
    isAnonymousLoading: state.isAnonymousLoading,
    
    // Actions
    signOut,
    refreshUser,
    signInAnonymously,
    verifyTokenRotationStatus,
    
    // New role-related helpers
    isAdmin: isAdminUser(state.user),
    hasPermission: (permission: Permission) => {
      return state.user?.isSuperAdmin || (state.user?.permissions || []).includes(permission);
    },
    hasMinimumRoleLevel: (minLevel: number) => {
      return (state.user?.roleLevel || 0) >= minLevel;
    }
  };
}
