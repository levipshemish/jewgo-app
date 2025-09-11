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
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<TokenPair> | null = null;

  constructor() {
    this.loadTokensFromStorage();
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
   * Get current user profile
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
    } catch (error) {
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
      } catch (error) {
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
}