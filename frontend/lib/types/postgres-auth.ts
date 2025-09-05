/**
 * PostgreSQL Authentication Types
 * Type definitions for the PostgreSQL-based authentication system
 */

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_verified: boolean;
  roles: string[];
  created_at?: string;
  last_login_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface TransformedUser {
  id: string;
  email: string;
  name?: string | null;
  username?: string;
  avatar_url?: string;
  is_guest?: boolean;
  is_verified?: boolean;
  created_at?: string;
  provider?: string;
  roles: Array<{
    role: string;
    level: number;
    granted_at: string;
  }>;
  // Admin properties for backward compatibility
  adminRole?: string;
  roleLevel?: number;
  permissions?: string[];
  isSuperAdmin?: boolean;
  providerInfo?: {
    provider: string;
    displayName: string;
    icon: string;
  };
  createdAt?: string;
  updatedAt?: string;
  isEmailVerified?: boolean;
  // Additional properties for AdminUser compatibility
  isPhoneVerified?: boolean;
  role?: string;
  subscriptionTier?: string;
}

export type AuthProvider = 'email' | 'google' | 'apple' | 'anonymous';

export const AUTH_PROVIDERS = {
  email: {
    provider: 'email',
    displayName: 'Email',
    icon: '📧'
  },
  google: {
    provider: 'google',
    displayName: 'Google',
    icon: '🔍'
  },
  apple: {
    provider: 'apple',
    displayName: 'Apple',
    icon: '🍎'
  },
  anonymous: {
    provider: 'anonymous',
    displayName: 'Guest',
    icon: '👤'
  },
  unknown: {
    provider: 'unknown',
    displayName: 'Unknown',
    icon: '❓'
  }
} as const;

export interface RegistrationData {
  email: string;
  password: string;
  name?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

export interface EmailVerificationData {
  verification_token: string;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface UserRole {
  role: string;
  level: number;
  granted_at: string;
  expires_at?: string;
}

export interface AdminRole {
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthAuditLog {
  id: number;
  user_id?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  details: Record<string, any>;
  created_at: string;
}

// Legacy compatibility types
export type SupabaseUser = AuthUser;
export type SupabaseSession = AuthSession;
export type SupabaseAuthResponse = AuthResponse;
