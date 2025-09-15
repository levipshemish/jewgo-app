'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { postgresAuth } from '@/lib/auth/postgres-auth';
import SessionList from './SessionList';
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface SessionManagerProps {
  className?: string;
}

interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export default function SessionManager({ className = '' }: SessionManagerProps) {
  const { user } = useAuth();
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<{
    type: 'single' | 'all';
    sessionId?: string;
    sessionName?: string;
  } | null>(null);

  const showNotification = useCallback((notification: NotificationState) => {
    setNotification(notification);
    // Auto-hide after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleSessionRevoked = useCallback((sessionId: string) => {
    showNotification({
      type: 'success',
      message: 'Session revoked successfully',
      details: 'The selected session has been terminated and the user will be logged out from that device.'
    });
  }, [showNotification]);

  const handleAllSessionsRevoked = useCallback(() => {
    showNotification({
      type: 'success',
      message: 'All sessions revoked successfully',
      details: 'All active sessions have been terminated. You will be logged out from all devices.'
    });
  }, [showNotification]);

  const confirmRevokeSession = (sessionId: string, sessionName: string) => {
    setShowConfirmation({
      type: 'single',
      sessionId,
      sessionName
    });
  };

  const confirmRevokeAllSessions = () => {
    setShowConfirmation({
      type: 'all'
    });
  };

  const executeRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/v5/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to revoke session: ${response.statusText}`);
      }

      handleSessionRevoked(sessionId);
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to revoke session',
        details: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  };

  const executeRevokeAllSessions = async () => {
    try {
      const response = await fetch('/api/v5/auth/sessions/revoke-all', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to revoke all sessions: ${response.statusText}`);
      }

      handleAllSessionsRevoked();
      
      // Logout current user and redirect
      await postgresAuth.logout();
      window.location.href = '/auth/signin';
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to revoke all sessions',
        details: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  };

  const handleConfirmRevoke = async () => {
    if (!showConfirmation) return;

    if (showConfirmation.type === 'single' && showConfirmation.sessionId) {
      await executeRevokeSession(showConfirmation.sessionId);
    } else if (showConfirmation.type === 'all') {
      await executeRevokeAllSessions();
    }

    setShowConfirmation(null);
  };

  const handleCancelRevoke = () => {
    setShowConfirmation(null);
  };

  if (!user) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Authentication Required</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please sign in to manage your active sessions.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Session Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor and control your active sessions across all devices
            </p>
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <SessionList
          onSessionRevoked={handleSessionRevoked}
          onAllSessionsRevoked={handleAllSessionsRevoked}
        />
      </div>

      {/* Security Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Information</h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Session Security</h4>
              <p className="text-sm text-gray-600 mt-1">
                Each session is tied to a specific device and browser. Sessions automatically 
                expire after 30 days of inactivity or can be manually revoked.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Suspicious Activity</h4>
              <p className="text-sm text-gray-600 mt-1">
                If you notice any unrecognized sessions or suspicious activity, 
                revoke those sessions immediately and consider changing your password.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Current Session</h4>
              <p className="text-sm text-gray-600 mt-1">
                Your current session is marked with a green indicator. This session 
                cannot be revoked from this interface for security reasons.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 max-w-sm w-full bg-white border rounded-lg shadow-lg p-4 z-50 ${
          notification.type === 'success' ? 'border-green-200 bg-green-50' :
          notification.type === 'error' ? 'border-red-200 bg-red-50' :
          notification.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
          'border-blue-200 bg-blue-50'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
              {notification.type === 'error' && <XCircleIcon className="h-5 w-5 text-red-500" />}
              {notification.type === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />}
              {notification.type === 'info' && <InformationCircleIcon className="h-5 w-5 text-blue-500" />}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                notification.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </p>
              {notification.details && (
                <p className={`text-sm mt-1 ${
                  notification.type === 'success' ? 'text-green-700' :
                  notification.type === 'error' ? 'text-red-700' :
                  notification.type === 'warning' ? 'text-yellow-700' :
                  'text-blue-700'
                }`}>
                  {notification.details}
                </p>
              )}
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => setNotification(null)}
                className={`inline-flex rounded-md p-1.5 ${
                  notification.type === 'success' ? 'text-green-500 hover:bg-green-100' :
                  notification.type === 'error' ? 'text-red-500 hover:bg-red-100' :
                  notification.type === 'warning' ? 'text-yellow-500 hover:bg-yellow-100' :
                  'text-blue-500 hover:bg-blue-100'
                }`}
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">
                {showConfirmation.type === 'all' ? 'Revoke All Sessions' : 'Revoke Session'}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {showConfirmation.type === 'all' ? (
                    <>
                      Are you sure you want to revoke all active sessions? This will log you out 
                      from all devices and you'll need to sign in again.
                    </>
                  ) : (
                    <>
                      Are you sure you want to revoke the session for{' '}
                      <span className="font-medium">{showConfirmation.sessionName}</span>? 
                      The user will be logged out from that device.
                    </>
                  )}
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleConfirmRevoke}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 mr-2"
                >
                  {showConfirmation.type === 'all' ? 'Revoke All Sessions' : 'Revoke Session'}
                </button>
                <button
                  onClick={handleCancelRevoke}
                  className="mt-3 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
