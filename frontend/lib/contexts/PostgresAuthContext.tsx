"use client"

/**
 * PostgreSQL Authentication Context
 * Provides authentication state and functions throughout the application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { postgresAuth, type AuthUser } from '@/lib/auth/postgres-auth';

interface PostgresAuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const PostgresAuthContext = createContext<PostgresAuthContextType | undefined>(undefined);

export function PostgresAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user state
    const getInitialUser = async () => {
      try {
        if (postgresAuth.isAuthenticated()) {
          const userProfile = await postgresAuth.getProfile();
          setUser(userProfile);
        }
      } catch (error) {
        console.error('Error getting initial user:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await postgresAuth.login({ email, password });
      setUser(result.user);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      const result = await postgresAuth.register({ email, password, name });
      setUser(result.user);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await postgresAuth.logout();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshUser = async () => {
    try {
      if (postgresAuth.isAuthenticated()) {
        const userProfile = await postgresAuth.getProfile();
        setUser(userProfile);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  const value: PostgresAuthContextType = {
    user,
    loading,
    signOut,
    signIn,
    signUp,
    refreshUser,
  };

  return (
    <PostgresAuthContext.Provider value={value}>
      {children}
    </PostgresAuthContext.Provider>
  );
}

export function usePostgresAuth(): PostgresAuthContextType {
  const context = useContext(PostgresAuthContext);
  if (context === undefined) {
    throw new Error('usePostgresAuth must be used within a PostgresAuthProvider');
  }
  return context;
}

// Legacy export for backward compatibility during migration
export const useSupabase = usePostgresAuth;
export const SupabaseProvider = PostgresAuthProvider;
