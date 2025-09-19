/**
 * Session Status Component
 * 
 * Displays session status and warnings to users:
 * - Session expiration warnings
 * - Automatic refresh notifications
 * - Session expired notifications with login prompts
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionManager } from '@/lib/auth/session-manager';

interface SessionStatusProps {
  showExpirationWarning?: boolean;
  showRefreshNotification?: boolean;
  className?: string;
}

export function SessionStatus({ 
  showExpirationWarning = true, 
  showRefreshNotification = true,
  className = ''
}: SessionStatusProps) {
  const { user, sessionExpired, timeUntilExpiration } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Listen for session refresh events
  useEffect(() => {
    if (!user) return;

    const removeListener = sessionManager.addListener((isAuthenticated) => {
      if (isAuthenticated && lastRefreshTime) {
        setIsRefreshing(false);
        setLastRefreshTime(new Date());
      }
    });

    return removeListener;
  }, [user, lastRefreshTime]);

  // Don't show anything if user is not authenticated
  if (!user) return null;

  // Show session expired message
  if (sessionExpired) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-3 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Session Expired
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Your session has expired. Please refresh the page or log in again to continue.</p>
            </div>
            <div className="mt-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show refresh notification
  if (isRefreshing && showRefreshNotification) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-md p-3 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Refreshing Session
            </h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>Your session is being refreshed automatically...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show expiration warning
  if (timeUntilExpiration !== null && timeUntilExpiration <= 5 && showExpirationWarning) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-md p-3 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Session Expiring Soon
            </h3>
            <div className="mt-1 text-sm text-yellow-700">
              <p>
                Your session will expire in {timeUntilExpiration} minute{timeUntilExpiration !== 1 ? 's' : ''}. 
                It will be refreshed automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if everything is fine
  return null;
}

/**
 * Compact session status for headers/navbars
 */
export function CompactSessionStatus({ className = '' }: { className?: string }) {
  const { user, sessionExpired, timeUntilExpiration } = useAuth();

  if (!user) return null;

  if (sessionExpired) {
    return (
      <div className={`text-red-600 text-xs ${className}`}>
        <span className="inline-flex items-center">
          <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Session expired
        </span>
      </div>
    );
  }

  if (timeUntilExpiration !== null && timeUntilExpiration <= 2) {
    return (
      <div className={`text-yellow-600 text-xs ${className}`}>
        <span className="inline-flex items-center">
          <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Expires in {timeUntilExpiration}m
        </span>
      </div>
    );
  }

  return null;
}
