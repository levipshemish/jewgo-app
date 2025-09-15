/**
 * Enhanced Authentication Service for JewGo Frontend
 * 
 * Integrates with the new backend security features including:
 * - JWT token management with automatic refresh
 * - Step-up authentication
 * - WebAuthn support
 * - Rate limiting awareness
 * - Proper error handling
 */

import { AuthUser, LoginResponse, RegisterData } from '../auth-service';

export interface StepUpChallenge {
  challenge_id: string;
  required_method: 'password' | 'webauthn';
  expires_at: string;
  step_up_url: string;
}

export interface WebAuthnCredential {
  credential_id: string;
  device_name: string;
  device_type: string;
  created_at: string;
  last_used?: string;
}


export interface AuthServiceConfig {
  baseUrl: string;
  enableWebAuthn: boolean;
  tokenRefreshThreshold: number; // Refresh token when this many seconds remain
  maxRetryAttempts: number;
  retryDelay: number;
}

class EnhancedAuthService {
  private config: AuthServiceConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private retryCount: number = 0;

  constructor(config?: Partial<AuthServiceConfig>) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app',
      enableWebAuthn: process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED === 'true',
      tokenRefreshThreshold: 300, // 5 minutes
      maxRetryAttempts: 2,
      retryDelay: 1000,
      ...config
    };
    
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = sessionStorage.getItem('access_token');
      this.refreshToken = this.getCookie('refresh_token');
      const expiresAt = sessionStorage.getItem('token_expires_at');
      this.tokenExpiresAt = expiresAt ? parseInt(expiresAt) : null;
    }
  }

  private saveTokens(accessToken: string, refreshToken?: string, expiresIn?: number) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('access_token', accessToken);
      this.accessToken = accessToken;
      
      if (refreshToken) {
        // Refresh token is handled via HttpOnly cookie by the backend
        this.refreshToken = refreshToken;
      }
      
      if (expiresIn) {
        const expiresAt = Date.now() + (expiresIn * 1000);
        sessionStorage.setItem('token_expires_at', expiresAt.toString());
        this.tokenExpiresAt = expiresAt;
      }
    }
  }

  private clearTokens() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('token_expires_at');
      // Clear refresh token cookie by calling logout endpoint
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiresAt = null;
    }
  }

  private getCookie(name: string): string | null {
    if (typeof window === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private async makeRequest(
    url: string, 
    options: RequestInit = {},
    requiresAuth: boolean = false
  ): Promise<Response> {
    // Check if token needs refresh before making request
    if (requiresAuth && this.shouldRefreshToken()) {
      await this.ensureValidToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (requiresAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.config.baseUrl}${url}`, {
      ...options,
      headers,
      credentials: 'include' // Include cookies for refresh token
    });

    // Handle authentication errors
    if (response.status === 401 && requiresAuth) {
      if (this.retryCount < this.config.maxRetryAttempts) {
        this.retryCount++;
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          return this.makeRequest(url, options, requiresAuth);
        }
      }
      this.clearTokens();
      throw new AuthError('Authentication failed', 'TOKEN_EXPIRED');
    }

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const error = new AuthError('Too many requests. Please try again later.', 'RATE_LIMIT_EXCEEDED');
      error.retry_after = retryAfter ? parseInt(retryAfter) : 60;
      throw error;
    }

    // Handle step-up authentication
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'STEP_UP_REQUIRED') {
        const error = new AuthError(errorData.message || 'Step-up authentication required', errorData.code);
        error.step_up_challenge = {
          challenge_id: errorData.challenge_id,
          required_method: errorData.required_method,
          expires_at: errorData.expires_at,
          step_up_url: errorData.step_up_url
        };
        throw error;
      }
    }

    this.retryCount = 0; // Reset retry count on successful request
    return response;
  }

  private shouldRefreshToken(): boolean {
    if (!this.tokenExpiresAt) return false;
    const now = Date.now();
    const threshold = this.config.tokenRefreshThreshold * 1000;
    return (this.tokenExpiresAt - now) < threshold;
  }

  private async ensureValidToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshAccessToken();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  // Public API Methods

  async register(data: RegisterData): Promise<AuthUser> {
    const response = await this.makeRequest('/api/v5/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'Registration failed', error.code || 'REGISTRATION_FAILED', error.message);
    }

    const result = await response.json();
    return result.user;
  }

  async login(email: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> {
    const response = await this.makeRequest('/api/v5/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me: rememberMe })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'Login failed', error.code || 'LOGIN_FAILED', error.message);
    }

    const result = await response.json();
    this.saveTokens(
      result.tokens.access_token,
      result.tokens.refresh_token,
      result.tokens.expires_in
    );
    
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/api/v5/auth/logout', {
        method: 'POST'
      }, true);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.accessToken) return null;

    try {
      const response = await this.makeRequest('/api/v5/auth/profile', {}, true);

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async updateProfile(data: Partial<AuthUser>): Promise<AuthUser> {
    const response = await this.makeRequest('/api/v5/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }, true);

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'Profile update failed', error.code || 'UPDATE_FAILED', error.message);
    }

    const result = await response.json();
    return result.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await this.makeRequest('/api/v5/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    }, true);

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'Password change failed', error.code || 'PASSWORD_CHANGE_FAILED', error.message);
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/v5/auth/refresh', {
        method: 'POST'
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const result = await response.json();
      this.saveTokens(
        result.tokens.access_token,
        result.tokens.refresh_token,
        result.tokens.expires_in
      );
      return true;
    } catch (error) {
      console.error('Refresh token error:', error);
      this.clearTokens();
      return false;
    }
  }

  async verifyToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await this.makeRequest('/api/v5/auth/verify-token', {
        method: 'HEAD'
      }, true);

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Step-up Authentication

  async createStepUpChallenge(requiredMethod: 'password' | 'webauthn', returnTo?: string): Promise<StepUpChallenge> {
    const response = await this.makeRequest('/api/v5/auth/step-up/challenge', {
      method: 'POST',
      body: JSON.stringify({
        required_method: requiredMethod,
        return_to: returnTo
      })
    }, true);

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'Step-up challenge failed', error.code || 'STEP_UP_FAILED', error.message);
    }

    const result = await response.json();
    return result;
  }

  async verifyStepUp(challengeId: string, method: 'password' | 'webauthn', credentials: any): Promise<void> {
    const response = await this.makeRequest('/api/v5/auth/step-up/verify', {
      method: 'POST',
      body: JSON.stringify({
        challenge_id: challengeId,
        method,
        ...credentials
      })
    }, true);

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'Step-up verification failed', error.code || 'STEP_UP_VERIFICATION_FAILED', error.message);
    }
  }

  // WebAuthn Support

  async isWebAuthnSupported(): Promise<boolean> {
    return this.config.enableWebAuthn && 
           typeof window !== 'undefined' && 
           'credentials' in navigator &&
           'create' in navigator.credentials;
  }

  async createWebAuthnRegistrationChallenge(deviceName?: string): Promise<any> {
    if (!await this.isWebAuthnSupported()) {
      throw new AuthError('WebAuthn not supported', 'WEBAUTHN_NOT_SUPPORTED', 'WebAuthn is not supported in this browser');
    }

    const response = await this.makeRequest('/api/v5/auth/webauthn/register/challenge', {
      method: 'POST',
      body: JSON.stringify({ device_name: deviceName })
    }, true);

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'WebAuthn challenge failed', error.code || 'WEBAUTHN_CHALLENGE_FAILED', error.message);
    }

    const result = await response.json();
    return result.options;
  }

  async verifyWebAuthnRegistration(credential: any, deviceName?: string): Promise<WebAuthnCredential> {
    const response = await this.makeRequest('/api/v5/auth/webauthn/register/verify', {
      method: 'POST',
      body: JSON.stringify({
        credential,
        device_name: deviceName
      })
    }, true);

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'WebAuthn registration failed', error.code || 'WEBAUTHN_REGISTRATION_FAILED', error.message);
    }

    const result = await response.json();
    return result;
  }

  async createWebAuthnAuthenticationChallenge(username?: string): Promise<any> {
    if (!await this.isWebAuthnSupported()) {
      throw new AuthError('WebAuthn not supported', 'WEBAUTHN_NOT_SUPPORTED', 'WebAuthn is not supported in this browser');
    }

    const response = await this.makeRequest('/api/v5/auth/webauthn/challenge', {
      method: 'POST',
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'WebAuthn challenge failed', error.code || 'WEBAUTHN_CHALLENGE_FAILED', error.message);
    }

    const result = await response.json();
    return result.options;
  }

  async verifyWebAuthnAuthentication(assertion: any): Promise<LoginResponse> {
    const response = await this.makeRequest('/api/v5/auth/webauthn/verify', {
      method: 'POST',
      body: JSON.stringify({ assertion })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'WebAuthn authentication failed', error.code || 'WEBAUTHN_AUTH_FAILED', error.message);
    }

    const result = await response.json();
    this.saveTokens(
      result.tokens.access_token,
      result.tokens.refresh_token,
      result.tokens.expires_in
    );
    
    return result;
  }

  async getUserWebAuthnCredentials(): Promise<WebAuthnCredential[]> {
    const response = await this.makeRequest('/api/v5/auth/webauthn/credentials', {}, true);

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'Failed to get credentials', error.code || 'GET_CREDENTIALS_FAILED', error.message);
    }

    const result = await response.json();
    return result.credentials;
  }

  async revokeWebAuthnCredential(credentialId: string): Promise<void> {
    const response = await this.makeRequest(`/api/v5/auth/webauthn/credentials/${credentialId}`, {
      method: 'DELETE'
    }, true);

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error || 'Failed to revoke credential', error.code || 'REVOKE_CREDENTIAL_FAILED', error.message);
    }
  }

  // Utility Methods

  isAuthenticated(): boolean {
    return !!this.accessToken && !this.isTokenExpired();
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) return false;
    return Date.now() >= this.tokenExpiresAt;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getTokenExpiresAt(): number | null {
    return this.tokenExpiresAt;
  }

  async getUserPermissions(): Promise<string[]> {
    const response = await this.makeRequest('/api/v5/auth/permissions', {}, true);

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.permissions || [];
  }

  hasPermission(permission: string): Promise<boolean> {
    return this.getUserPermissions().then(permissions => 
      permissions.includes(permission)
    );
  }

  async hasRole(role: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }

  async isAdmin(): Promise<boolean> {
    return this.hasRole('admin') || this.hasRole('super_admin');
  }
}

// Custom error class for authentication errors
export class AuthError extends Error {
  public code: string;
  public error: string;
  public message: string;
  public correlation_id?: string;
  public step_up_challenge?: StepUpChallenge;
  public retry_after?: number;
  public originalMessage: string;

  constructor(message: string, code: string, originalMessage?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.error = message;
    this.message = message;
    this.originalMessage = originalMessage || message;
  }
}

// Export singleton instance
export const enhancedAuthService = new EnhancedAuthService();
export { EnhancedAuthService };
export type { AuthServiceConfig, StepUpChallenge, WebAuthnCredential };