'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { postgresAuth, type AuthUser } from '@/lib/auth/postgres-auth';
import { sessionManager } from '@/lib/auth/session-manager';

// Global flag to prevent multiple auth checks across all instances
// Note: These are currently unused but kept for future optimization
// const _globalAuthCheckDone = false;
// const _globalAuthCheckPromise: Promise<void> | null = null;

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: () => boolean;
  sessionExpired: boolean;
  timeUntilExpiration: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [timeUntilExpiration, setTimeUntilExpiration] = useState<number | null>(null);
  const hasRunRef = useRef(false);
  const checkAuthPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // Prevent multiple concurrent auth checks (React Strict Mode protection)
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    const initializeAuth = async () => {
      try {
        // Initialize session manager
        await sessionManager.initialize();
        
        // Set up session state listener
        const removeListener = sessionManager.addListener((isAuthenticated) => {
          setSessionExpired(!isAuthenticated);
          setTimeUntilExpiration(sessionManager.getTimeUntilExpiration());
          
          if (!isAuthenticated) {
            setUser(null);
          }
        });
        
        // Initial auth check
        const isActive = await sessionManager.checkSession();
        if (isActive) {
          const currentUser = await postgresAuth.getProfile();
          setUser(currentUser);
        }
        
        // Cleanup listener on unmount
        return removeListener;
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setSessionExpired(true);
        return () => {}; // Return empty cleanup function
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []); // Empty dependency array - only run once on mount

  const login = async (email: string, password: string) => {
    try {
      const response = await postgresAuth.login({ email, password });
      setUser(response.user);
      setSessionExpired(false);
      // Session manager will automatically detect the new session
      await sessionManager.checkSession();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: { email: string; password: string; name?: string }) => {
    try {
      await postgresAuth.register(data);
      // After registration, log the user in
      await login(data.email, data.password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Starting logout process...');
      await postgresAuth.logout();
      console.log('AuthContext: Backend logout completed, clearing user state');
      setUser(null);
      setSessionExpired(false);
      setTimeUntilExpiration(null);
      setLoading(false);
      // Stop session manager
      sessionManager.stop();
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      // Even if logout fails, clear the user state
      console.log('AuthContext: Clearing user state despite logout error');
      setUser(null);
      setSessionExpired(false);
      setTimeUntilExpiration(null);
      setLoading(false);
      sessionManager.stop();
    }
  };

  const refreshUser = async () => {
    try {
      // Use session manager for refresh to handle retries and session management
      await sessionManager.refreshSession();
      const currentUser = await postgresAuth.getProfile();
      setUser(currentUser);
      setSessionExpired(false);
    } catch (_error) {
      // Silently handle auth errors during refresh
      setUser(null);
      setSessionExpired(true);
    }
  };

  const isAuthenticated = () => {
    // In cookie-mode we cannot synchronously determine auth; reflect state
    return !!user;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated,
    sessionExpired,
    timeUntilExpiration,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
