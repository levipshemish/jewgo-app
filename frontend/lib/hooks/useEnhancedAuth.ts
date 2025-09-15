/**
 * Enhanced Authentication Hooks for JewGo Frontend
 * 
 * Provides React hooks for authentication state management,
 * step-up authentication, and WebAuthn integration.
 */

import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { enhancedAuthService, AuthError, StepUpChallenge, WebAuthnCredential } from '../auth/enhanced-auth-service';
import { AuthUser } from '../auth-service';

// Auth Context
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => Promise<boolean>;
  hasRole: (role: string) => Promise<boolean>;
  isAdmin: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await enhancedAuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const result = await enhancedAuthService.login(email, password, rememberMe);
      setUser(result.user);
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await enhancedAuthService.logout();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  }, [router]);

  const register = useCallback(async (data: any) => {
    try {
      const user = await enhancedAuthService.register(data);
      // Note: User might need email verification before being fully authenticated
      return user;
    } catch (error) {
      throw error;
    }
  }, []);

  const hasPermission = useCallback(async (permission: string): Promise<boolean> => {
    return enhancedAuthService.hasPermission(permission);
  }, []);

  const hasRole = useCallback(async (role: string): Promise<boolean> => {
    return enhancedAuthService.hasRole(role);
  }, []);

  const isAdmin = useCallback(async (): Promise<boolean> => {
    return enhancedAuthService.isAdmin();
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        if (enhancedAuthService.isAuthenticated()) {
          await refreshUser();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    refreshUser,
    hasPermission,
    hasRole,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Main Auth Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Step-up Authentication Hook
export function useStepUpAuth() {
  const [isStepUpRequired, setIsStepUpRequired] = useState(false);
  const [stepUpChallenge, setStepUpChallenge] = useState<StepUpChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createStepUpChallenge = useCallback(async (
    requiredMethod: 'password' | 'webauthn',
    returnTo?: string
  ) => {
    setIsLoading(true);
    try {
      const challenge = await enhancedAuthService.createStepUpChallenge(requiredMethod, returnTo);
      setStepUpChallenge(challenge);
      setIsStepUpRequired(true);
      return challenge;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyStepUp = useCallback(async (
    challengeId: string,
    method: 'password' | 'webauthn',
    credentials: any
  ) => {
    setIsLoading(true);
    try {
      await enhancedAuthService.verifyStepUp(challengeId, method, credentials);
      setIsStepUpRequired(false);
      setStepUpChallenge(null);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearStepUp = useCallback(() => {
    setIsStepUpRequired(false);
    setStepUpChallenge(null);
  }, []);

  return {
    isStepUpRequired,
    stepUpChallenge,
    isLoading,
    createStepUpChallenge,
    verifyStepUp,
    clearStepUp
  };
}

// WebAuthn Hook
export function useWebAuthn() {
  const [isSupported, setIsSupported] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = await enhancedAuthService.isWebAuthnSupported();
      setIsSupported(supported);
    };
    checkSupport();
  }, []);

  const loadCredentials = useCallback(async () => {
    if (!enhancedAuthService.isAuthenticated()) return;
    
    setIsLoading(true);
    try {
      const userCredentials = await enhancedAuthService.getUserWebAuthnCredentials();
      setCredentials(userCredentials);
    } catch (error) {
      console.error('Failed to load WebAuthn credentials:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerCredential = useCallback(async (deviceName?: string) => {
    if (!isSupported) {
      throw new AuthError('WebAuthn not supported', 'WEBAUTHN_NOT_SUPPORTED');
    }

    setIsLoading(true);
    try {
      // Get registration challenge
      const options = await enhancedAuthService.createWebAuthnRegistrationChallenge(deviceName);
      
      // Create credential using WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: options
      });

      if (!credential) {
        throw new AuthError('Credential creation failed', 'CREDENTIAL_CREATION_FAILED');
      }

      // Verify registration
      const result = await enhancedAuthService.verifyWebAuthnRegistration(credential, deviceName);
      
      // Reload credentials
      await loadCredentials();
      
      return result;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('WebAuthn registration failed', 'WEBAUTHN_REGISTRATION_FAILED', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, loadCredentials]);

  const authenticateWithWebAuthn = useCallback(async (username?: string) => {
    if (!isSupported) {
      throw new AuthError('WebAuthn not supported', 'WEBAUTHN_NOT_SUPPORTED');
    }

    setIsLoading(true);
    try {
      // Get authentication challenge
      const options = await enhancedAuthService.createWebAuthnAuthenticationChallenge(username);
      
      // Get assertion using WebAuthn API
      const assertion = await navigator.credentials.get({
        publicKey: options
      });

      if (!assertion) {
        throw new AuthError('Authentication failed', 'WEBAUTHN_AUTH_FAILED');
      }

      // Verify authentication
      const result = await enhancedAuthService.verifyWebAuthnAuthentication(assertion);
      
      return result;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('WebAuthn authentication failed', 'WEBAUTHN_AUTH_FAILED', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const revokeCredential = useCallback(async (credentialId: string) => {
    setIsLoading(true);
    try {
      await enhancedAuthService.revokeWebAuthnCredential(credentialId);
      await loadCredentials();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadCredentials]);

  return {
    isSupported,
    credentials,
    isLoading,
    loadCredentials,
    registerCredential,
    authenticateWithWebAuthn,
    revokeCredential
  };
}

// Protected Route Hook
export function useProtectedRoute(requiredPermissions?: string[], requiredRoles?: string[]) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (isLoading) return;

      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      if (!requiredPermissions && !requiredRoles) {
        setHasAccess(true);
        return;
      }

      try {
        let hasPermission = true;
        let hasRole = true;

        if (requiredPermissions) {
          const permissionChecks = await Promise.all(
            requiredPermissions.map(permission => enhancedAuthService.hasPermission(permission))
          );
          hasPermission = permissionChecks.some(check => check);
        }

        if (requiredRoles) {
          const roleChecks = await Promise.all(
            requiredRoles.map(role => enhancedAuthService.hasRole(role))
          );
          hasRole = roleChecks.some(check => check);
        }

        const access = hasPermission && hasRole;
        setHasAccess(access);

        if (!access) {
          router.push('/unauthorized');
        }
      } catch (error) {
        console.error('Access check error:', error);
        setHasAccess(false);
        router.push('/error');
      }
    };

    checkAccess();
  }, [user, isLoading, isAuthenticated, requiredPermissions, requiredRoles, router]);

  return {
    hasAccess,
    isLoading: isLoading || hasAccess === null,
    user
  };
}

// API Request Hook with Auth
export function useAuthenticatedRequest() {
  const { logout } = useAuth();

  const makeRequest = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    try {
      const token = enhancedAuthService.getAccessToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      // Handle authentication errors
      if (response.status === 401) {
        await logout();
        throw new AuthError('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      // Handle step-up authentication
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === 'STEP_UP_REQUIRED') {
          const error = new AuthError(errorData.error, errorData.code, errorData.message);
          error.stepUpChallenge = errorData.step_up_challenge;
          throw error;
        }
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const error = new AuthError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
        error.retryAfter = retryAfter ? parseInt(retryAfter) : 60;
        throw error;
      }

      return response;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Request failed', 'REQUEST_FAILED', error.message);
    }
  }, [logout]);

  return { makeRequest };
}

// Error Handling Hook
export function useAuthError() {
  const [error, setError] = useState<AuthError | null>(null);
  const { createStepUpChallenge } = useStepUpAuth();

  const handleError = useCallback(async (error: any) => {
    if (error instanceof AuthError) {
      setError(error);

      // Handle step-up authentication automatically
      if (error.code === 'STEP_UP_REQUIRED' && error.stepUpChallenge) {
        // You might want to show a step-up modal here
        console.log('Step-up authentication required:', error.stepUpChallenge);
      }

      // Handle rate limiting
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        console.log('Rate limit exceeded, retry after:', error.retryAfter);
      }
    } else {
      setError(new AuthError('Unknown error', 'UNKNOWN_ERROR', error.message));
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError
  };
}