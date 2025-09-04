/**
 * PostgreSQL-based authentication client to replace Supabase authentication.
 * 
 * This module provides client-side authentication functions that communicate
 * with the backend PostgreSQL authentication API.
 */

interface AuthUser {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  full_name?: string;
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
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

interface RegistrationData {
  email: string;
  password: string;
  name?: string;
}

interface LoginData {
  email: string;
  password: string;
}

class PostgresAuthError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
    this.name = 'PostgresAuthError';
  }
}

class PostgresAuthClient {
  private baseUrl: string;
  public accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Use environment variable or default to backend URL
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
    
    // Load tokens from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('auth_access_token');
      this.refreshToken = localStorage.getItem('auth_refresh_token');
    }
  }

  public async request(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}/api/auth${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if we have an access token
    if (this.accessToken) {
      defaultHeaders.Authorization = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new PostgresAuthError(
          `Rate limit exceeded. Try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}.`,
          'RATE_LIMIT_EXCEEDED',
          429
        );
      }

      return response;
    } catch (error) {
      if (error instanceof PostgresAuthError) {
        throw error;
      }
      
      // Handle network errors
      throw new PostgresAuthError(
        'Network error - please check your connection',
        'NETWORK_ERROR'
      );
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      throw new PostgresAuthError(
        data.error || 'Authentication request failed',
        data.code,
        response.status
      );
    }

    return data;
  }

  private saveTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;

    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;

    localStorage.setItem('auth_access_token', tokens.access_token);
    localStorage.setItem('auth_refresh_token', tokens.refresh_token);

    // Set token expiration reminder
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    localStorage.setItem('auth_expires_at', expiresAt.toString());
  }

  private clearTokens(): void {
    if (typeof window === 'undefined') return;

    this.accessToken = null;
    this.refreshToken = null;

    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_expires_at');
  }

  /**
   * Register a new user account
   */
  async register(data: RegistrationData): Promise<{ user: AuthUser; message: string }> {
    const response = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  /**
   * Log in with email and password
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const result: AuthResponse = await this.handleResponse(response);
    this.saveTokens(result.tokens);
    return result;
  }

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint (for audit logging)
      await this.request('/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<AuthUser> {
    if (!this.accessToken) {
      throw new PostgresAuthError('No access token available', 'NOT_AUTHENTICATED', 401);
    }

    const response = await this.request('/profile');
    const result = await this.handleResponse<{ user: AuthUser }>(response);
    return result.user;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: { name: string }): Promise<void> {
    if (!this.accessToken) {
      throw new PostgresAuthError('No access token available', 'NOT_AUTHENTICATED', 401);
    }

    const response = await this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    await this.handleResponse(response);
  }

  /**
   * Update user data
   */
  async updateUser(data: { full_name?: string; [key: string]: any }): Promise<void> {
    if (!this.accessToken) {
      throw new PostgresAuthError('No access token available', 'NOT_AUTHENTICATED', 401);
    }

    const response = await this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    await this.handleResponse(response);
  }

  /**
   * Change user password
   */
  async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    if (!this.accessToken) {
      throw new PostgresAuthError('No access token available', 'NOT_AUTHENTICATED', 401);
    }

    const response = await this.request('/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    await this.handleResponse(response);
  }

  /**
   * Verify email with verification token
   */
  async verifyEmail(verificationToken: string): Promise<void> {
    const response = await this.request('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ verification_token: verificationToken }),
    });

    await this.handleResponse(response);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.refreshToken) {
      throw new PostgresAuthError('No refresh token available', 'NOT_AUTHENTICATED', 401);
    }

    const response = await this.request('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    const tokens: AuthTokens = await this.handleResponse(response);
    this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem('auth_access_token');
    const expiresAt = localStorage.getItem('auth_expires_at');
    
    if (!token || !expiresAt) return false;
    
    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const expiry = parseInt(expiresAt);
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return now < (expiry - buffer);
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Check if current user has specific role
   */
  async hasRole(roleName: string): Promise<boolean> {
    try {
      const user = await this.getProfile();
      return user.roles.some(role => role.role === roleName);
    } catch {
      return false;
    }
  }

  /**
   * Check if current user has minimum role level
   */
  async hasMinimumRoleLevel(level: number): Promise<boolean> {
    try {
      const user = await this.getProfile();
      const maxLevel = Math.max(...user.roles.map(role => role.level), 0);
      return maxLevel >= level;
    } catch {
      return false;
    }
  }

  /**
   * Check if current user is admin
   */
  async isAdmin(): Promise<boolean> {
    return this.hasMinimumRoleLevel(10); // Admin level is 10
  }

  /**
   * Check if current user is moderator or higher
   */
  async isModerator(): Promise<boolean> {
    return this.hasMinimumRoleLevel(5); // Moderator level is 5
  }

  /**
   * Handle automatic token refresh on API failures
   */
  async withTokenRefresh<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      if (error instanceof PostgresAuthError && error.status === 401) {
        // Try to refresh the token
        try {
          await this.refreshAccessToken();
          // Retry the original call
          return await apiCall();
        } catch (_refreshError) {
          // Refresh failed, clear tokens and throw original error
          this.clearTokens();
          throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      // Call the backend logout endpoint if we have a token
      if (this.accessToken) {
        await this.request('/logout', {
          method: 'POST',
        });
      }
    } catch (error) {
      // Even if the backend call fails, we should clear local tokens
      console.warn('Backend logout failed, but clearing local tokens:', error);
    } finally {
      // Always clear local tokens
      this.clearTokens();
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await this.request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        reset_token: token,
        new_password: newPassword,
      }),
    });

    await this.handleResponse(response);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const response = await this.request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    await this.handleResponse(response);
  }
}

// Export singleton instance
export const postgresAuth = new PostgresAuthClient();

// Export types and error class
export type { AuthUser, AuthTokens, AuthResponse, RegistrationData, LoginData };
export { PostgresAuthError };
