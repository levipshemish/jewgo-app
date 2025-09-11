/**
 * V5 Authentication Token Manager
 * 
 * Handles JWT token management, refresh, and storage for the v5 API client.
 */

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  roles: string[];
  created_at?: string;
  last_login?: string;
  is_active: boolean;
}

export class AuthTokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'jewgo_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'jewgo_refresh_token';
  private static readonly USER_PROFILE_KEY = 'jewgo_user_profile';
  private static readonly TOKEN_EXPIRY_KEY = 'jewgo_token_expiry';

  /**
   * Store authentication tokens and user profile
   */
  static setTokens(tokens: TokenPair, userProfile: UserProfile): void {
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access_token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh_token);
      localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(userProfile));
      
      // Calculate expiry time
      const expiryTime = Date.now() + (tokens.expires_in * 1000);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Get stored access token
   */
  static getAccessToken(): string | null {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Get stored user profile
   */
  static getUserProfile(): UserProfile | null {
    try {
      const profileStr = localStorage.getItem(this.USER_PROFILE_KEY);
      return profileStr ? JSON.parse(profileStr) : null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Check if access token is expired
   */
  static isTokenExpired(): boolean {
    try {
      const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
      if (!expiryStr) return true;
      
      const expiryTime = parseInt(expiryStr, 10);
      return Date.now() >= expiryTime;
    } catch (error) {
      console.error('Failed to check token expiry:', error);
      return true;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const profile = this.getUserProfile();
    return !!(token && profile && !this.isTokenExpired());
  }

  /**
   * Clear all stored authentication data
   */
  static clearTokens(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_PROFILE_KEY);
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Get authorization header value
   */
  static getAuthorizationHeader(): string | null {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(role: string): boolean {
    const profile = this.getUserProfile();
    return profile?.roles?.includes(role) ?? false;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(roles: string[]): boolean {
    const profile = this.getUserProfile();
    if (!profile?.roles) return false;
    
    return roles.some(role => profile.roles.includes(role));
  }

  /**
   * Get user's maximum role level (for RBAC)
   */
  static getMaxRoleLevel(): number {
    const profile = this.getUserProfile();
    if (!profile?.roles) return 0;
    
    // Define role levels (higher number = more permissions)
    const roleLevels: Record<string, number> = {
      'user': 1,
      'moderator': 5,
      'admin': 10,
      'super_admin': 15
    };
    
    return Math.max(...profile.roles.map(role => roleLevels[role] || 0));
  }

  /**
   * Get current user (alias for getUserProfile)
   */
  static getCurrentUser(): UserProfile | null {
    return this.getUserProfile();
  }

  /**
   * Get authentication state
   */
  static getAuthState(): AuthState {
    const user = this.getUserProfile();
    const token = this.getAccessToken();
    
    return {
      isAuthenticated: this.isAuthenticated(),
      user,
      token
    };
  }

  /**
   * Add authentication state listener
   */
  static addListener(callback: (state: AuthState) => void): () => void {
    // Simple implementation - in a real app, you'd use an event emitter
    const interval = setInterval(() => {
      callback(this.getAuthState());
    }, 1000);
    
    return () => clearInterval(interval);
  }

  /**
   * Validate authentication token
   */
  static validateAuth(token: string): boolean {
    if (!token) return false;
    
    try {
      // Basic JWT validation (check structure)
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Decode payload to check expiry
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Verify token (placeholder implementation)
   */
  static async verifyToken(token: string): Promise<{ valid: boolean; user?: UserProfile }> {
    // In a real implementation, this would verify the token with the server
    if (this.validateAuth(token)) {
      return { valid: true, user: this.getUserProfile() || undefined };
    }
    return { valid: false };
  }
}

// Export instances for backward compatibility
export const authClient = AuthTokenManager;
export const authManager = AuthTokenManager;

// Export types
export type AuthState = {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
};