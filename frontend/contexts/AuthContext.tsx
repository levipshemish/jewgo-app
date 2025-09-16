'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { postgresAuth, type AuthUser } from '@/lib/auth/postgres-auth';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const hasRunRef = useRef(false);
  const checkAuthPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // Prevent multiple concurrent auth checks (React Strict Mode protection)
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    const checkAuth = async () => {
      // Prevent concurrent auth checks
      if (checkAuthPromiseRef.current) {
        return checkAuthPromiseRef.current;
      }

      checkAuthPromiseRef.current = (async () => {
        try {
          // Probe backend profile; 200 => authenticated, 401 => not
          const currentUser = await postgresAuth.getProfile();
          setUser(currentUser);
        } catch (error) {
          // Handle rate limiting gracefully
          if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
            console.warn('Auth rate limit exceeded, treating as unauthenticated');
          }
          // Treat any failure as unauthenticated for client UX
          setUser(null);
        } finally {
          setLoading(false);
        }
      })();

      return checkAuthPromiseRef.current;
    };

    checkAuth();
  }, []); // Empty dependency array - only run once on mount

  const login = async (email: string, password: string) => {
    try {
      const response = await postgresAuth.login({ email, password });
      setUser(response.user);
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
      await postgresAuth.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await postgresAuth.getProfile();
      setUser(currentUser);
    } catch (error) {
      // Silently handle auth errors during refresh
      setUser(null);
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
