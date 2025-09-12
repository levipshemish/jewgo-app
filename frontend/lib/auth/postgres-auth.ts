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
  // Deprecated in cookie-mode. Kept for compatibility but unused.
  public accessToken: string | null = null;
  private refreshToken: string | null = null;
  private csrfToken: string | null = null;

  constructor() {
    // Use frontend API routes instead of direct backend calls
    // This ensures CORS headers are properly handled
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  }

  public async request(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}/api/auth${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Cookie-mode: do not attach Authorization; rely on HttpOnly cookies

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      // Always include credentials so HttpOnly cookies are sent
      credentials: 'include',
    };

    // Inject CSRF token for mutating requests (double-submit)
    const method = (config.method || 'GET').toString().toUpperCase();
    const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (unsafe) {
      if (!this.csrfToken) {
        try { await this.getCsrf(); } catch { /* ignore in dev */ }
      }
      if (this.csrfToken) {
        (config.headers as Record<string, string>)['X-CSRF-Token'] = this.csrfToken;
      }
    }

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

  /**
   * Fetch and cache CSRF token (and set CSRF cookie via backend)
   */
  public async getCsrf(): Promise<string> {
    const resp = await fetch(`${this.baseUrl}/api/auth/csrf`, { credentials: 'include', cache: 'no-store' });
    // Try to parse JSON, but handle HTML/error bodies gracefully
    const contentType = resp.headers.get('Content-Type') || '';
    let token: string | null = null;
    if (resp.ok) {
      try {
        if (contentType.includes('application/json')) {
          const data = await resp.json();
          token = data?.token ?? null;
        } else {
          // Unexpected content-type on success
          const _ = await resp.text();
          token = null;
        }
      } catch {
        // JSON parse failed
        token = null;
      }
      if (token) {
        this.csrfToken = token;
        return this.csrfToken;
      }
    }

    // Build a clearer error including status and a short body preview
    let bodyPreview = '';
    try { bodyPreview = (await resp.text()).slice(0, 120); } catch {}
    throw new PostgresAuthError(
      `Failed to obtain CSRF token (${resp.status}). ${bodyPreview}`,
      'CSRF_ERROR',
      resp.status,
    );
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    let data: any = null;
    let parsed = false;
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
        parsed = true;
      } catch {
        parsed = false;
      }
    }
    if (!parsed) {
      // Fallback to text for clearer error messages on HTML/error pages
      try { data = { error: (await response.text()).slice(0, 200) }; } catch { data = null; }
    }

    if (!response.ok) {
      const message = (data && (data.error || data.message)) || 'Authentication request failed';
      const code = data && data.code ? String(data.code) : undefined;
      throw new PostgresAuthError(message, code, response.status);
    }

    return data as T;
  }

  private saveTokens(_tokens: AuthTokens): void {
    // Deprecated: tokens are set as HttpOnly cookies by backend
    this.accessToken = null;
    this.refreshToken = null;
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
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
  async login(data: LoginData & { recaptcha_token?: string }): Promise<AuthResponse> {
    // Ensure CSRF cookie present
    try { await this.getCsrf(); } catch {}
    const response = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const result: AuthResponse = await this.handleResponse(response);
    // Tokens are set as cookies; nothing to persist client-side
    return result;
  }

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    try {
      try { await this.getCsrf(); } catch {}
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
    const response = await this.request('/profile');
    const result = await this.handleResponse<{ user: AuthUser }>(response);
    return result.user;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: { name: string }): Promise<void> {
    try { await this.getCsrf(); } catch {}
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
    try { await this.getCsrf(); } catch {}
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
    try { await this.getCsrf(); } catch {}
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
    try { await this.getCsrf(); } catch {}
    const response = await this.request('/refresh', {
      method: 'POST',
      // Body retains param for backward compatibility (server prefers cookie)
      body: JSON.stringify({}),
    });

    const tokens: AuthTokens = await this.handleResponse(response);
    // Tokens are cookie-based
    return tokens;
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    // Deprecated in cookie-mode: use middleware guard or call /api/auth/me server-side
    return false;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    // Deprecated with cookie-mode; no direct token access
    return null;
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
      try { await this.getCsrf(); } catch {}
      await this.request('/logout', { method: 'POST' });
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
    try { await this.getCsrf(); } catch {}
    const response = await this.request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    await this.handleResponse(response);
  }

  /**
   * Continue as Guest
   */
  async guestLogin(): Promise<AuthResponse> {
    try { await this.getCsrf(); } catch {}
    const response = await this.request('/guest', { method: 'POST' });
    const result: AuthResponse = await this.handleResponse(response);
    return result;
  }

  /**
   * Upgrade current guest session to an email/password account
   */
  async upgradeGuest(data: { email: string; password: string; name?: string }): Promise<AuthResponse> {
    try { await this.getCsrf(); } catch {}
    const response = await this.request('/upgrade-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result: AuthResponse = await this.handleResponse(response);

    // Best-effort hook: if/when merge endpoints exist, attempt to merge anon data
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
      // Try a soft ping to a hypothetical merge orchestrator; ignore failures
      await fetch(`${backendUrl}/api/auth/prepare-merge`, { method: 'POST', credentials: 'include' }).catch(() => {});
      await fetch(`${backendUrl}/api/auth/merge-anonymous`, { method: 'POST', credentials: 'include' }).catch(() => {});
    } catch {}

    return result;
  }
}

// Export singleton instance
export const postgresAuth = new PostgresAuthClient();

// Export types and error class
export type { AuthUser, AuthTokens, AuthResponse, RegistrationData, LoginData };
export { PostgresAuthError };
