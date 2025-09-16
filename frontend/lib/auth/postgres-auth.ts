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
  terms_accepted?: boolean;
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
  private _csrfPromise: Promise<string> | null = null;
  
  // Enhanced auth client properties for loop guards and deduplication
  private refreshPromise: Promise<AuthResponse> | null = null;
  private refreshAttempts: number = 0;
  private maxRefreshAttempts: number = 2;
  private lastRefreshTime: number = 0;
  private refreshBackoffDelay: number = 1000; // Base delay in ms
  private requestTimeoutMs: number = 10000; // 10 seconds default timeout
  
  // Request throttling and deduplication
  private lastRequestTime: { [key: string]: number } = {};
  private minRequestInterval: number = 100; // Minimum 100ms between requests to same endpoint
  private pendingRequests: { [key: string]: Promise<Response> } = {};

  constructor() {
    // Always prioritize NEXT_PUBLIC_BACKEND_URL if it's set, regardless of environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      this.baseUrl = backendUrl;
    } else {
      // Fallback to frontend API routes for backward compatibility
      this.baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    }
  }

  public async request(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    // Create a unique key for this request to enable deduplication
    const requestKey = `${endpoint}:${options.method || 'GET'}:${JSON.stringify(options.body || {})}`;
    
    // If there's already a pending identical request, return that promise
    const existingRequest = this.pendingRequests[requestKey];
    if (existingRequest) {
      return existingRequest;
    }
    
    // Throttle requests to prevent rapid-fire API calls
    const now = Date.now();
    const lastRequest = this.lastRequestTime[endpoint] || 0;
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime[endpoint] = Date.now();
    
    // Use direct backend URL if available, otherwise fallback to API routes
    const isDirectBackend = this.baseUrl !== (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const url = isDirectBackend ? `${this.baseUrl}/api/v5/auth${endpoint}` : `${this.baseUrl}/api/v5/auth${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {};
    
    // Only set Content-Type for requests with a body
    if (options.body) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    // Cookie-mode: do not attach Authorization; rely on HttpOnly cookies

    // Create AbortController for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      // Always include credentials so HttpOnly cookies are sent
      credentials: 'include',
      signal: controller.signal,
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

    // Create the request promise and store it for deduplication
    const requestPromise = (async () => {
      try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          throw new PostgresAuthError(
            `Rate limit exceeded. Try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}.`,
            'RATE_LIMIT_EXCEEDED',
            429
          );
        }

      // Handle 401 responses with loop guard
      if (response.status === 401) {
        await this.handleAuthError(new PostgresAuthError('Unauthorized', 'UNAUTHORIZED', 401));
      }

      // Handle 413 responses with user-friendly guidance
      if (response.status === 413) {
        const visibleCookies = this.getVisibleCookieNames();
        const hint = `Request headers too large (413). This often happens when too many or oversized cookies are sent to the API domain. Visible cookies: [${visibleCookies.join(', ')}]. Try clearing cookies for api.jewgo.app (and jewgo.app if needed), then retry.`;
        throw new PostgresAuthError(hint, 'REQUEST_HEADERS_TOO_LARGE', 413);
      }

      // Handle 403 responses by clearing CSRF cookies and local session state
      if (response.status === 403) {
        await this.handle403Response();
        throw new PostgresAuthError('Forbidden - CSRF token invalid or expired', 'CSRF_INVALID', 403);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof PostgresAuthError) {
        throw error;
      }
      
      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PostgresAuthError(
          'Request timeout - please try again',
          'REQUEST_TIMEOUT',
          408
        );
      }
      
      // Handle network errors
      throw new PostgresAuthError(
        'Network error - please check your connection',
        'NETWORK_ERROR'
      );
    } finally {
      // Clean up the pending request
      delete this.pendingRequests[requestKey];
    }
    })();

    // Store the promise for deduplication
    this.pendingRequests[requestKey] = requestPromise;
    
    return requestPromise;
  }

  /**
   * Fetch and cache CSRF token (and set CSRF cookie via backend)
   */
  public async getCsrf(): Promise<string> {
    // Return cached token if present
    if (this.csrfToken) return this.csrfToken;
    // Deduplicate concurrent requests
    if (this._csrfPromise) return this._csrfPromise;

    // v5 auth exposes CSRF at /api/v5/auth/csrf
    const url = `${this.baseUrl}/api/v5/auth/csrf`;
    const attempts = 3;
    let lastError: PostgresAuthError | null = null;

    this._csrfPromise = (async () => {
      for (let i = 0; i < attempts; i++) {
        try {
          const resp = await fetch(url, { credentials: 'include', cache: 'no-store' });
          const contentType = resp.headers.get('Content-Type') || '';
          let token: string | null = null;
          if (resp.ok) {
          try {
            if (contentType.includes('application/json')) {
              const data = await resp.json();
              token = data?.data?.csrf_token ?? data?.csrf_token ?? data?.token ?? null;
            } else {
              const _ = await resp.text();
              token = null;
            }
          } catch {
            token = null;
          }
          if (token) {
            this.csrfToken = token;
            return this.csrfToken;
          }
          }

          // Not OK response — construct informative error
          let bodyPreview = '';
          try { bodyPreview = (await resp.text()).slice(0, 120); } catch {}

        if (resp.status === 503) {
          lastError = new PostgresAuthError(
            'CSRF service unavailable (503). This may be a temporary outage. Retry shortly. If it persists, check API health and CSRF configuration on the backend.',
            'CSRF_SERVICE_UNAVAILABLE',
            503,
          );
        } else if (resp.status === 502) {
          lastError = new PostgresAuthError(
            'Gateway error (502) when fetching CSRF. This usually means the reverse proxy cannot reach the auth service. Retry shortly. If it persists, check Nginx upstream and the auth service health.',
            'CSRF_BAD_GATEWAY',
            502,
          );
        } else {
          lastError = new PostgresAuthError(
            `Failed to obtain CSRF token (${resp.status}). ${bodyPreview}`,
            'CSRF_ERROR',
            resp.status,
          );
        }

        // Backoff before next attempt (exponential: 200ms, 400ms)
        if (i < attempts - 1) {
          const delay = 200 * Math.pow(2, i);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        } catch (e) {
          // Network or other error; store and backoff
          lastError = e instanceof PostgresAuthError ? e : new PostgresAuthError('Network error fetching CSRF token', 'NETWORK_ERROR');
          if (i < attempts - 1) {
            const delay = 200 * Math.pow(2, i);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
        }
      }

      // Out of attempts
      throw lastError ?? new PostgresAuthError('Failed to obtain CSRF token', 'CSRF_ERROR');
    })();

    try {
      const token = await this._csrfPromise;
      return token;
    } finally {
      this._csrfPromise = null;
    }
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
   * Debug: list cookie names visible to JS on this origin.
   * Note: HttpOnly cookies (like auth cookies) won't appear here.
   */
  public getVisibleCookieNames(): string[] {
    if (typeof document === 'undefined') return [];
    try {
      return document.cookie
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => c.split('=')[0]);
    } catch {
      return [];
    }
  }

  /**
   * Debug: get total cookie size for troubleshooting 413 errors
   */
  public getCookieSizeInfo(): { totalSize: number; cookieCount: number; cookies: string[] } {
    if (typeof document === 'undefined') return { totalSize: 0, cookieCount: 0, cookies: [] };
    try {
      const cookieString = document.cookie;
      const cookies = cookieString.split(';').map((c) => c.trim()).filter(Boolean);
      return {
        totalSize: cookieString.length,
        cookieCount: cookies.length,
        cookies: cookies.map((c) => c.split('=')[0])
      };
    } catch {
      return { totalSize: 0, cookieCount: 0, cookies: [] };
    }
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

  // Auth request deduplication
  private _profilePromise: Promise<AuthUser> | null = null;

  /**
   * Get current user profile with deduplication
   */
  async getProfile(): Promise<AuthUser> {
    // If there's already a profile request in flight, return that promise
    if (this._profilePromise) {
      return this._profilePromise;
    }

    // Create new profile request
    this._profilePromise = this._fetchProfile();
    
    try {
      const result = await this._profilePromise;
      return result;
    } finally {
      // Clear the promise when done (success or failure)
      this._profilePromise = null;
    }
  }

  private async _fetchProfile(): Promise<AuthUser> {
    try {
      const response = await this.request('/profile');
      const result = await this.handleResponse<{ user: AuthUser }>(response);
      return result.user;
    } catch (err) {
      if (err instanceof PostgresAuthError && err.status === 413) {
        // Log detailed cookie information to aid debugging
        const cookieInfo = this.getCookieSizeInfo();
        console.error('[Auth] Profile fetch failed: 413 Request Too Large. Cookie info:', {
          totalSize: cookieInfo.totalSize,
          cookieCount: cookieInfo.cookieCount,
          cookies: cookieInfo.cookies
        });
        console.error('[Auth] Tip: clear cookies for api.jewgo.app if total size > 4KB');
      }
      throw err;
    }
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
   * Check if user is currently authenticated
   * In cookie-mode, this is a best-effort check using available client-side information
   */
  isAuthenticated(): boolean {
    // In cookie-mode, we can't reliably check HttpOnly cookies from client-side
    // This is a best-effort check - prefer server-side authentication checks
    if (typeof window === 'undefined') return false;
    
    // Check if we have any authentication-related cookies (best effort)
    const cookies = document.cookie;
    return cookies.includes('access_token') || cookies.includes('session');
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
   * Handle 403 responses by clearing CSRF cookies and local session state
  */
  private async handle403Response(): Promise<void> {
    // Clear CSRF token
    this.csrfToken = null;
    
    // Clear any local session state
    this.clearTokens();
    
    // No explicit CSRF delete endpoint in v5; backend will rotate on next GET
  }

  /**
   * Handle authentication errors with loop guard and exponential backoff
   */
  private async handleAuthError(error: PostgresAuthError): Promise<void> {
    if (error.status !== 401) {
      return;
    }

    // Check if we've exceeded max refresh attempts
    if (this.refreshAttempts >= this.maxRefreshAttempts) {
      this.refreshAttempts = 0;
      this.clearTokens();
      throw new PostgresAuthError(
        'Maximum refresh attempts exceeded - please log in again',
        'MAX_REFRESH_ATTEMPTS_EXCEEDED',
        401
      );
    }

    // Implement exponential backoff with jitter
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;
    const backoffDelay = this.refreshBackoffDelay * Math.pow(2, this.refreshAttempts);
    const jitter = Math.random() * 0.1 * backoffDelay; // 10% jitter
    const totalDelay = backoffDelay + jitter;

    if (timeSinceLastRefresh < totalDelay) {
      await new Promise(resolve => setTimeout(resolve, totalDelay - timeSinceLastRefresh));
    }

    this.refreshAttempts++;
    this.lastRefreshTime = Date.now();
  }

  /**
   * Enhanced token refresh with deduplication and loop guards
   */
  async refreshAccessToken(): Promise<AuthTokens> {
    // If there's already a refresh in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise.then(response => response.tokens);
    }

    // Create new refresh promise
    this.refreshPromise = this.performRefreshWithRetry();
    
    try {
      const result = await this.refreshPromise;
      // Reset refresh attempts on success
      this.refreshAttempts = 0;
      return result.tokens;
    } catch (error) {
      // Handle refresh failure
      if (error instanceof PostgresAuthError && error.status === 401) {
        await this.handleAuthError(error);
      }
      throw error;
    } finally {
      // Clear the promise when done (success or failure)
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual refresh with retry logic
   */
  private async performRefreshWithRetry(): Promise<AuthResponse> {
    try { await this.getCsrf(); } catch {}
    const response = await this.request('/refresh', {
      method: 'POST',
      // Body retains param for backward compatibility (server prefers cookie)
      body: JSON.stringify({}),
    });

    const result: AuthResponse = await this.handleResponse(response);
    // Tokens are cookie-based
    return result;
  }

  /**
   * Handle automatic token refresh on API failures
   */
  async withTokenRefresh<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      if (error instanceof PostgresAuthError && error.status === 401) {
        // Try to refresh the token with loop guard
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
