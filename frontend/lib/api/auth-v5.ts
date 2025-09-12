/**
 * Authentication token management for v5 API client.
 * 
 * Handles JWT token storage, refresh, and automatic token management
 * for authenticated API requests.
 */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export class AuthTokenManager {
  private static instance: AuthTokenManager;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<TokenPair> | null = null;

  private constructor() {
    this.loadTokensFromStorage();
  }

  static getInstance(): AuthTokenManager {
    if (!AuthTokenManager.instance) {
      AuthTokenManager.instance = new AuthTokenManager();
    }
    return AuthTokenManager.instance;
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: TokenPair): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.expiresAt = tokens.expiresAt;
    this.saveTokensToStorage();
  }

  /**
   * Get current access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      return null;
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    if (Date.now() >= this.expiresAt - 300000) {
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken || this.refreshPromise) {
      return;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newTokens = await this.refreshPromise;
      this.setTokens(newTokens);
    } catch (error) {
      this.clearTokens();
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform actual token refresh request
   */
  private async performTokenRefresh(): Promise<TokenPair> {
    const response = await fetch('/api/v5/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + (data.expiresIn * 1000)
    };
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.removeTokensFromStorage();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && Date.now() < this.expiresAt;
  }

  /**
   * Get current access token synchronously (without refresh)
   */
  getAccessTokenSync(): string | null {
    return this.accessToken;
  }

  /**
   * Set user profile
   */
  setUser(user: UserProfile): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_profile', JSON.stringify(user));
    }
  }

  /**
   * Get current user profile
   */
  getCurrentUser(): UserProfile | null {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user_profile');
        return userStr ? JSON.parse(userStr) : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get current user profile (async version)
   */
  async getUserProfile(): Promise<UserProfile | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const token = await this.getAccessToken();
      const response = await fetch('/api/v5/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (_error) {
      return null;
    }
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokensToStorage(): void {
    if (typeof window !== 'undefined') {
      const tokens = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt
      };
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    }
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokensFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('auth_tokens');
        if (stored) {
          const tokens = JSON.parse(stored);
          this.accessToken = tokens.accessToken;
          this.refreshToken = tokens.refreshToken;
          this.expiresAt = tokens.expiresAt;
        }
      } catch (_error) {
        // Ignore storage errors
      }
    }
  }

  /**
   * Remove tokens from localStorage
   */
  private removeTokensFromStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_tokens');
    }
  }

  // Static methods for backward compatibility
  static getAccessToken(): string | null {
    return AuthTokenManager.getInstance().getAccessTokenSync();
  }

  static getRefreshToken(): string | null {
    return AuthTokenManager.getInstance().refreshToken;
  }

  static setTokens(tokens: TokenPair, user?: UserProfile): void {
    AuthTokenManager.getInstance().setTokens(tokens);
    if (user) {
      AuthTokenManager.getInstance().setUser(user);
    }
  }

  static clearTokens(): void {
    AuthTokenManager.getInstance().clearTokens();
  }

  static isAuthenticated(): boolean {
    return AuthTokenManager.getInstance().isAuthenticated();
  }

  static getCurrentUser(): UserProfile | null {
    return AuthTokenManager.getInstance().getCurrentUser();
  }

  /**
   * Verify token with backend
   */
  async verifyToken(token: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch('/api/v5/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return { valid: true };
      } else {
        return { valid: false, error: 'Token verification failed' };
      }
    } catch (_error) {
      return { valid: false, error: 'Token verification error' };
    }
  }

  /**
   * Get current auth state
   */
  getAuthState(): AuthState {
    return {
      isAuthenticated: this.isAuthenticated(),
      user: this.getCurrentUser(),
      loading: false
    };
  }

  /**
   * Add auth state listener
   */
  addListener(callback: (state: AuthState) => void): () => void {
    // Simple implementation - in a real app you'd use an event emitter
    const interval = setInterval(() => {
      callback(this.getAuthState());
    }, 1000);

    return () => clearInterval(interval);
  }
}

// Export singleton instance and types
export const authManager = AuthTokenManager.getInstance();
export const authClient = AuthTokenManager.getInstance();

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
}