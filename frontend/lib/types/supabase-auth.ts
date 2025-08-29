/**
 * Comprehensive Supabase Authentication Type Definitions
 * 
 * This module provides complete type safety for Supabase authentication operations,
 * including user management, session handling, and auth state management.
 */

import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import type { Permission } from '@/lib/constants/permissions';

// Core Supabase Auth Types
export interface SupabaseAuthConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  autoRefreshToken?: boolean;
  persistSession?: boolean;
  detectSessionInUrl?: boolean;
  flowType?: 'pkce' | 'implicit';
  debug?: boolean;
}

// Enhanced User Types
export interface JewGoUser extends Omit<User, 'app_metadata' | 'user_metadata'> {
  user_metadata: {
    full_name?: string;
    name?: string;
    username?: string;
    avatar_url?: string;
    picture?: string;
    provider?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
    custom_claims?: Record<string, unknown>;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
    role?: string;
    permissions?: string[];
    subscription_tier?: string;
    created_at?: string;
    updated_at?: string;
  };
}

// Transformed User Types (for internal use)
export interface TransformedUser {
  id: string;
  email: string | undefined;
  name: string | null;
  username: string | undefined;
  provider: AuthProvider;
  avatar_url: string | null;
  providerInfo: ProviderInfo;
  createdAt: string;
  updatedAt: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  role: string;
  permissions: readonly Permission[];
  subscriptionTier: string;
  // New role fields
  /** Nullable role string when present */
  adminRole: string | null;
  /** Numeric rank, defaults to 0 */
  roleLevel: number;
  /** Always boolean defaulting to false */
  isSuperAdmin: boolean;
}

export type AuthProvider = 'apple' | 'google' | 'email' | 'phone' | 'github' | 'discord' | 'unknown';

export interface ProviderInfo {
  name: string;
  icon: string;
  color: string;
  displayName: string;
}

// Session Types
export interface JewGoSession extends Omit<Session, 'expires_in' | 'user'> {
  user: JewGoUser;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type: string;
  provider_token?: string;
  provider_refresh_token?: string;
}

// Auth State Types
export interface AuthState {
  user: TransformedUser | null;
  session: JewGoSession | null;
  loading: boolean;
  error: AuthError | null;
  initialized: boolean;
}

// Auth Change Event Types
export type AuthChangeEventType = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'MFA_CHALLENGE_VERIFIED'
  | 'PASSWORD_RECOVERY'
  | 'INITIAL_SESSION';

// Sign In Types
export interface SignInCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  captchaToken?: string;
}

export interface SignInWithOAuthCredentials {
  provider: AuthProvider;
  redirectTo?: string;
  scopes?: string;
  queryParams?: Record<string, string>;
}

export interface SignInWithPhoneCredentials {
  phone: string;
  password?: string;
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  phone?: string;
  data?: Record<string, any>;
  captchaToken?: string;
}

// Password Management Types
export interface PasswordResetRequest {
  email: string;
  captchaToken?: string;
}

export interface PasswordUpdateRequest {
  password: string;
  currentPassword?: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

// MFA Types
export interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: 'totp' | 'webauthn';
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

export interface MFAEnrollRequest {
  factorType: 'totp' | 'webauthn';
  friendlyName?: string;
}

export interface MFAChallengeRequest {
  factorId: string;
  code?: string;
  challengeId?: string;
}

// Profile Management Types
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  phone?: string;
  website?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  language?: string;
  preferences?: UserPreferences;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  marketing_emails: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  privacy_level: 'public' | 'private' | 'friends';
}

export interface ProfileUpdateRequest {
  full_name?: string;
  username?: string;
  avatar_url?: string;
  phone?: string;
  website?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  language?: string;
  preferences?: Partial<UserPreferences>;
  metadata?: Record<string, any>;
}

// Auth Error Types
export interface AuthErrorInfo {
  message: string;
  status?: number;
  name?: string;
  stack?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export type AuthErrorType = 
  | 'InvalidCredentials'
  | 'EmailNotConfirmed'
  | 'InvalidEmail'
  | 'WeakPassword'
  | 'EmailAlreadyInUse'
  | 'PhoneAlreadyInUse'
  | 'InvalidPhone'
  | 'InvalidOTP'
  | 'ExpiredOTP'
  | 'TooManyRequests'
  | 'NetworkError'
  | 'ServerError'
  | 'UnknownError';

// Auth Hook Types
export interface UseAuthOptions {
  onAuthStateChange?: (event: AuthChangeEventType, session: JewGoSession | null) => void;
  onError?: (error: AuthError) => void;
  onUserUpdate?: (user: TransformedUser) => void;
  redirectTo?: string;
  autoRefreshToken?: boolean;
}

export interface UseAuthReturn {
  user: TransformedUser | null;
  session: JewGoSession | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (credentials: SignInCredentials) => Promise<AuthResult>;
  signInWithOAuth: (credentials: SignInWithOAuthCredentials) => Promise<AuthResult>;
  signInWithPhone: (credentials: SignInWithPhoneCredentials) => Promise<AuthResult>;
  signUp: (credentials: SignUpCredentials) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (request: PasswordResetRequest) => Promise<AuthResult>;
  updatePassword: (request: PasswordUpdateRequest) => Promise<AuthResult>;
  updateProfile: (request: ProfileUpdateRequest) => Promise<AuthResult>;
  refreshSession: () => Promise<AuthResult>;
  getMFAFactors: () => Promise<MFAFactor[]>;
  enrollMFA: (request: MFAEnrollRequest) => Promise<AuthResult>;
  challengeMFA: (request: MFAChallengeRequest) => Promise<AuthResult>;
}

// Auth Result Types
export interface AuthResult {
  success: boolean;
  data?: any;
  error?: AuthError;
  user?: TransformedUser;
  session?: JewGoSession;
}

// Session Management Types
export interface SessionManager {
  getSession(): Promise<JewGoSession | null>;
  setSession(session: JewGoSession): Promise<void>;
  clearSession(): Promise<void>;
  refreshSession(): Promise<JewGoSession | null>;
  isSessionValid(session: JewGoSession): boolean;
  getSessionExpiry(session: JewGoSession): Date | null;
}

// Token Management Types
export interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  scope?: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  expiresAt: Date | null;
  timeToExpiry: number; // seconds
  needsRefresh: boolean;
}

// Auth Middleware Types
export interface AuthMiddlewareConfig {
  requireAuth: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  onUnauthorized?: (user: TransformedUser | null) => void;
}

export interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

// Auth Context Types
export interface AuthContextValue {
  user: TransformedUser | null;
  session: JewGoSession | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (credentials: SignInCredentials) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  updateProfile: (request: ProfileUpdateRequest) => Promise<AuthResult>;
  refreshSession: () => Promise<AuthResult>;
}

// Utility Types
export interface AuthUtils {
  isAuthenticated: (user: TransformedUser | null) => boolean;
  hasRole: (user: TransformedUser | null, role: string) => boolean;
  hasPermission: (user: TransformedUser | null, permission: string) => boolean;
  hasAnyRole: (user: TransformedUser | null, roles: string[]) => boolean;
  hasAnyPermission: (user: TransformedUser | null, permissions: string[]) => boolean;
  isEmailVerified: (user: TransformedUser | null) => boolean;
  isPhoneVerified: (user: TransformedUser | null) => boolean;
  getProviderInfo: (provider: AuthProvider) => ProviderInfo;
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string) => PasswordValidationResult;
  validatePhone: (phone: string) => boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  score: number; // 0-100
}

// Auth Event Types
export interface AuthEvent {
  type: AuthChangeEventType;
  session: JewGoSession | null;
  user: TransformedUser | null;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Auth Analytics Types
export interface AuthAnalyticsEvent {
  event: string;
  user_id?: string;
  session_id?: string;
  provider?: AuthProvider;
  timestamp: Date;
  properties?: Record<string, any>;
}

// Auth Configuration Types
export interface AuthConfig {
  supabase: SupabaseAuthConfig;
  auth: {
    autoRefreshToken: boolean;
    persistSession: boolean;
    detectSessionInUrl: boolean;
    flowType: 'pkce' | 'implicit';
    debug: boolean;
  };
  session: {
    defaultTTL: number;
    refreshThreshold: number;
    maxRefreshAttempts: number;
  };
  security: {
    requireEmailVerification: boolean;
    requirePhoneVerification: boolean;
    passwordMinLength: number;
    passwordRequirements: string[];
    maxLoginAttempts: number;
    lockoutDuration: number;
    mfaRequired: boolean;
  };
  providers: {
    enabled: AuthProvider[];
    redirectUrls: Record<AuthProvider, string>;
    scopes: Record<AuthProvider, string[]>;
  };
}

// Type Guards
export function isJewGoUser(user: any): user is JewGoUser {
  return user && typeof user.id === 'string' && typeof user.email === 'string';
}

export function isJewGoSession(session: any): session is JewGoSession {
  return session && isJewGoUser(session.user) && typeof session.access_token === 'string';
}

export function isTransformedUser(user: any): user is TransformedUser {
  return user && typeof user.id === 'string' && typeof user.provider === 'string';
}

// Constants
export const AUTH_PROVIDERS: Record<AuthProvider, ProviderInfo> = {
  apple: {
    name: 'Apple',
    icon: '🍎',
    color: '#000000',
    displayName: 'Apple'
  },
  google: {
    name: 'Google',
    icon: '🔍',
    color: '#4285F4',
    displayName: 'Google'
  },
  email: {
    name: 'Email',
    icon: '📧',
    color: '#007AFF',
    displayName: 'Email'
  },
  phone: {
    name: 'Phone',
    icon: '📱',
    color: '#34C759',
    displayName: 'Phone'
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    color: '#333333',
    displayName: 'GitHub'
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    color: '#5865F2',
    displayName: 'Discord'
  },
  unknown: {
    name: 'Unknown',
    icon: '❓',
    color: '#8E8E93',
    displayName: 'Unknown'
  }
};

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  supabase: {
    url: '',
    anonKey: '',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: false
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: false
  },
  session: {
    defaultTTL: 3600,
    refreshThreshold: 300,
    maxRefreshAttempts: 3
  },
  security: {
    requireEmailVerification: true,
    requirePhoneVerification: false,
    passwordMinLength: 8,
    passwordRequirements: ['uppercase', 'lowercase', 'number', 'special'],
    maxLoginAttempts: 5,
    lockoutDuration: 900,
    mfaRequired: false
  },
  providers: {
    enabled: ['email', 'google'],
    redirectUrls: {
      apple: '',
      google: '',
      email: '',
      phone: '',
      github: '',
      discord: '',
      unknown: ''
    },
    scopes: {
      apple: ['email', 'name'],
      google: ['email', 'profile'],
      email: [],
      phone: [],
      github: ['user:email'],
      discord: ['identify', 'email'],
      unknown: []
    }
  }
};
