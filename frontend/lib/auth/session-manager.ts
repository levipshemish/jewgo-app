/**
 * Session Management System
 * 
 * Provides automatic session management including:
 * - Token refresh before expiration
 * - Session expiration detection
 * - Automatic logout on authentication failure
 * - Periodic session validation
 */

import { postgresAuth } from './postgres-auth';

interface SessionConfig {
  refreshThreshold: number; // Minutes before expiration to refresh
  checkInterval: number; // Minutes between session checks
  maxRetries: number; // Max retry attempts for failed requests
}

interface SessionState {
  isActive: boolean;
  lastChecked: Date;
  expiresAt: Date | null;
  refreshPromise: Promise<void> | null;
}

class SessionManager {
  private config: SessionConfig;
  private state: SessionState;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private listeners: Set<(isAuthenticated: boolean) => void> = new Set();
  private isInitialized = false;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      refreshThreshold: 5, // Refresh 5 minutes before expiration
      checkInterval: 2, // Check every 2 minutes
      maxRetries: 3,
      ...config
    };

    this.state = {
      isActive: false,
      lastChecked: new Date(),
      expiresAt: null,
      refreshPromise: null
    };
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔐 SessionManager: Initializing...');
    
    // Initial session check
    await this.checkSession();
    
    // Start periodic checks
    this.startPeriodicChecks();
    
    this.isInitialized = true;
    console.log('✅ SessionManager: Initialized');
  }

  /**
   * Stop the session manager
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.isInitialized = false;
    console.log('🛑 SessionManager: Stopped');
  }

  /**
   * Add a listener for authentication state changes
   */
  addListener(listener: (isAuthenticated: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Check if session is currently active
   */
  isSessionActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get time until session expires (in minutes)
   */
  getTimeUntilExpiration(): number | null {
    if (!this.state.expiresAt) return null;
    const now = new Date();
    const diff = this.state.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60)));
  }

  /**
   * Check session status and refresh if needed
   */
  async checkSession(): Promise<boolean> {
    try {
      console.log('🔍 SessionManager: Checking session status...');
      
      // Check if user is authenticated by calling getProfile
      const user = await postgresAuth.getProfile();
      
      if (user) {
        // User is authenticated
        this.state.isActive = true;
        this.state.lastChecked = new Date();
        
        // Estimate expiration time (access tokens typically last 15 minutes)
        this.state.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        console.log('✅ SessionManager: Session is active');
        
        // Check if we need to refresh soon
        const timeUntilExpiration = this.getTimeUntilExpiration();
        if (timeUntilExpiration !== null && timeUntilExpiration <= this.config.refreshThreshold) {
          console.log(`🔄 SessionManager: Token expires in ${timeUntilExpiration} minutes, refreshing...`);
          await this.refreshSession();
        }
        
        this.notifyListeners(true);
        return true;
      } else {
        // User is not authenticated
        this.state.isActive = false;
        this.state.expiresAt = null;
        console.log('❌ SessionManager: Session is not active');
        this.notifyListeners(false);
        return false;
      }
    } catch (error) {
      console.error('🚨 SessionManager: Session check failed:', error);
      
      // If we get a 401, the session has expired
      if (this.isAuthError(error)) {
        this.state.isActive = false;
        this.state.expiresAt = null;
        this.notifyListeners(false);
        return false;
      }
      
      // For other errors, keep the current state but update last checked
      this.state.lastChecked = new Date();
      return this.state.isActive;
    }
  }

  /**
   * Refresh the session by calling the backend
   */
  async refreshSession(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.state.refreshPromise) {
      return this.state.refreshPromise.then(() => this.state.isActive);
    }

    this.state.refreshPromise = this.performRefresh();
    
    try {
      await this.state.refreshPromise;
      return this.state.isActive;
    } finally {
      this.state.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<void> {
    try {
      console.log('🔄 SessionManager: Refreshing session...');
      
      // Call getProfile to refresh the session
      const user = await postgresAuth.getProfile();
      
      if (user) {
        this.state.isActive = true;
        this.state.lastChecked = new Date();
        this.state.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        console.log('✅ SessionManager: Session refreshed successfully');
        this.notifyListeners(true);
      } else {
        throw new Error('No user returned from refresh');
      }
    } catch (error) {
      console.error('🚨 SessionManager: Session refresh failed:', error);
      
      if (this.isAuthError(error)) {
        this.state.isActive = false;
        this.state.expiresAt = null;
        this.notifyListeners(false);
        
        // Optionally trigger logout
        this.handleSessionExpired();
      }
      
      throw error;
    }
  }

  /**
   * Handle API request with automatic retry and session management
   */
  async withSessionRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check session before making the request
        if (!this.state.isActive) {
          await this.checkSession();
        }
        
        // Make the API call
        return await apiCall();
        
      } catch (error) {
        lastError = error as Error;
        
        // If it's an auth error, try to refresh the session
        if (this.isAuthError(error) && attempt < maxRetries) {
          console.log(`🔄 SessionManager: Auth error on attempt ${attempt + 1}, trying to refresh session...`);
          
          try {
            await this.refreshSession();
            // Continue to next attempt
            continue;
          } catch (refreshError) {
            console.error('🚨 SessionManager: Session refresh failed:', refreshError);
            // If refresh fails, the session is definitely expired
            this.handleSessionExpired();
            throw refreshError;
          }
        }
        
        // If it's not an auth error or we've exhausted retries, throw the error
        if (attempt === maxRetries || !this.isAuthError(error)) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpired(): void {
    console.log('🚨 SessionManager: Session has expired, clearing state...');
    
    this.state.isActive = false;
    this.state.expiresAt = null;
    this.notifyListeners(false);
    
    // Clear any cached auth state
    postgresAuth.clearTokens();
  }

  /**
   * Start periodic session checks
   */
  private startPeriodicChecks(): void {
    if (this.checkIntervalId) return;
    
    const intervalMs = this.config.checkInterval * 60 * 1000;
    
    this.checkIntervalId = setInterval(async () => {
      try {
        await this.checkSession();
      } catch (error) {
        console.error('🚨 SessionManager: Periodic check failed:', error);
      }
    }, intervalMs);
    
    console.log(`⏰ SessionManager: Started periodic checks every ${this.config.checkInterval} minutes`);
  }

  /**
   * Check if an error is authentication-related
   */
  private isAuthError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = String(error);
    
    return (
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('Authentication expired') ||
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('401') ||
      errorString.includes('Authentication required') ||
      errorString.includes('Authentication expired') ||
      errorString.includes('Unauthorized') ||
      errorString.includes('401')
    );
  }

  /**
   * Notify all listeners of authentication state changes
   */
  private notifyListeners(isAuthenticated: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isAuthenticated);
      } catch (error) {
        console.error('🚨 SessionManager: Error notifying listener:', error);
      }
    });
  }
}

// Create a singleton instance
export const sessionManager = new SessionManager();

// Export types
export type { SessionConfig, SessionState };
