'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { postgresAuth, type AuthUser } from '@/lib/auth/postgres-auth';

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

  useEffect(() => {
    // Check if user is already authenticated on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (postgresAuth.isAuthenticated()) {
        const currentUser = await postgresAuth.getProfile();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

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
      const result = await postgresAuth.register(data);
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
      if (postgresAuth.isAuthenticated()) {
        const currentUser = await postgresAuth.getProfile();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      setUser(null);
    }
  };

  const isAuthenticated = () => {
    return postgresAuth.isAuthenticated();
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
