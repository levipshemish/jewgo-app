/**
 * useSessionManagement Hook
 * 
 * Provides easy access to session management functionality:
 * - Check session status
 * - Refresh session manually
 * - Get session expiration info
 * - Handle API calls with automatic retry
 */

import { useAuth } from '@/contexts/AuthContext';
import { sessionManager } from '@/lib/auth/session-manager';
import { useCallback, useEffect, useState } from 'react';

export function useSessionManagement() {
  const { user, sessionExpired, timeUntilExpiration } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Check if session is active (not expired)
  const isSessionActive = isAuthenticated && !sessionExpired;

  // Get time until expiration in minutes
  const minutesUntilExpiration = timeUntilExpiration;

  // Check if session is expiring soon (within 5 minutes)
  const isExpiringSoon = minutesUntilExpiration !== null && minutesUntilExpiration <= 5;

  // Check if session is critically low (within 2 minutes)
  const isCriticallyLow = minutesUntilExpiration !== null && minutesUntilExpiration <= 2;

  // Manually refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    setIsRefreshing(true);
    try {
      const success = await sessionManager.refreshSession();
      return success;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  // Check session status
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      return await sessionManager.checkSession();
    } catch (error) {
      console.error('Failed to check session:', error);
      return false;
    }
  }, []);

  // Make API call with automatic session retry
  const withSessionRetry = useCallback(async <T>(
    apiCall: () => Promise<T>,
    maxRetries?: number
  ): Promise<T> => {
    return await sessionManager.withSessionRetry(apiCall, maxRetries);
  }, []);

  // Force logout (useful when session is definitely expired)
  const forceLogout = useCallback(() => {
    sessionManager.stop();
    window.location.reload(); // Simple way to clear all state
  }, []);

  // Get session status summary
  const getSessionStatus = useCallback(() => {
    if (!isAuthenticated) return 'not_authenticated';
    if (sessionExpired) return 'expired';
    if (isCriticallyLow) return 'critically_low';
    if (isExpiringSoon) return 'expiring_soon';
    return 'active';
  }, [isAuthenticated, sessionExpired, isCriticallyLow, isExpiringSoon]);

  // Get human-readable status message
  const getSessionStatusMessage = useCallback(() => {
    const status = getSessionStatus();
    
    switch (status) {
      case 'not_authenticated':
        return 'Not logged in';
      case 'expired':
        return 'Session expired - please log in again';
      case 'critically_low':
        return `Session expires in ${minutesUntilExpiration} minute${minutesUntilExpiration !== 1 ? 's' : ''} - refreshing automatically`;
      case 'expiring_soon':
        return `Session expires in ${minutesUntilExpiration} minute${minutesUntilExpiration !== 1 ? 's' : ''} - will refresh automatically`;
      case 'active':
        return `Session active (expires in ${minutesUntilExpiration} minutes)`;
      default:
        return 'Unknown session status';
    }
  }, [getSessionStatus, minutesUntilExpiration]);

  return {
    // State
    isAuthenticated,
    isSessionActive,
    sessionExpired,
    isRefreshing,
    minutesUntilExpiration,
    isExpiringSoon,
    isCriticallyLow,
    
    // Actions
    refreshSession,
    checkSession,
    withSessionRetry,
    forceLogout,
    
    // Status info
    getSessionStatus,
    getSessionStatusMessage,
  };
}

/**
 * Hook for components that need to handle session expiration gracefully
 */
export function useSessionAwareApi() {
  const { withSessionRetry, isSessionActive, sessionExpired } = useSessionManagement();

  // Wrapper for API calls that automatically handles session management
  const apiCall = useCallback(async <T>(
    apiFunction: () => Promise<T>,
    options?: {
      maxRetries?: number;
      onSessionExpired?: () => void;
      onRetry?: (attempt: number) => void;
    }
  ): Promise<T> => {
    const { maxRetries, onSessionExpired, onRetry } = options || {};

    // If session is expired, call the handler immediately
    if (sessionExpired) {
      onSessionExpired?.();
      throw new Error('Session expired');
    }

    try {
      return await withSessionRetry(apiFunction, maxRetries);
    } catch (error) {
      // Check if it's a session-related error
      if (error instanceof Error && (
        error.message.includes('Authentication required') ||
        error.message.includes('Authentication expired') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('401')
      )) {
        onSessionExpired?.();
      }
      throw error;
    }
  }, [withSessionRetry, sessionExpired]);

  return {
    apiCall,
    isSessionActive,
    sessionExpired,
  };
}
