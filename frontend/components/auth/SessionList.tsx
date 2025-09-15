'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { postgresAuth } from '@/lib/auth/postgres-auth';
import { 
  DevicePhoneMobileIcon, 
  ComputerDesktopIcon, 
  GlobeAltIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface SessionData {
  id: string;
  device_info: {
    user_agent: string;
    device_type: 'mobile' | 'desktop' | 'tablet' | 'unknown';
    browser: string;
    os: string;
  };
  location: {
    ip_address: string;
    city?: string;
    country?: string;
    is_vpn?: boolean;
  };
  created_at: string;
  last_used: string;
  expires_at: string;
  is_current: boolean;
  family_id: string;
}

interface SessionListProps {
  onSessionRevoked?: (sessionId: string, sessionName?: string) => void;
  onAllSessionsRevoked?: () => void;
}

export default function SessionList({ onSessionRevoked, onAllSessionsRevoked }: SessionListProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v5/auth/sessions', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const revokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    setError(null);

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

      // Get session name before removing from list
      const sessionToRevoke = sessions.find(s => s.id === sessionId);
      const sessionName = sessionToRevoke?.device_info?.user_agent || 'Unknown Device';
      
      // Remove session from list
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      onSessionRevoked?.(sessionId, sessionName);

      // If current session was revoked, redirect to login
      const currentSession = sessions.find(s => s.id === sessionId);
      if (currentSession?.is_current) {
        await postgresAuth.logout();
        window.location.href = '/auth/signin';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setRevokingSession(null);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('Are you sure you want to revoke all sessions? You will be logged out from all devices.')) {
      return;
    }

    setRevokingAll(true);
    setError(null);

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

      // Clear sessions list
      setSessions([]);
      onAllSessionsRevoked?.();

      // Logout current user
      await postgresAuth.logout();
      window.location.href = '/auth/signin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke all sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
        case 'mobile':
          return <DevicePhoneMobileIcon className="h-5 w-5" />;
      case 'desktop':
        return <ComputerDesktopIcon className="h-5 w-5" />;
      case 'tablet':
        return <DevicePhoneMobileIcon className="h-5 w-5" />;
      default:
        return <GlobeAltIcon className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getStatusIcon = (session: SessionData) => {
    if (session.is_current) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    
    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    if (timeUntilExpiry < 24 * 60 * 60 * 1000) { // Less than 24 hours
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
    
    return <ClockIcon className="h-5 w-5 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
        <button
          onClick={loadSessions}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage your active sessions across all devices
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={revokeAllSessions}
            disabled={revokingAll}
            className="mt-3 sm:mt-0 inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {revokingAll ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-red-300 border-t-red-600 rounded-full"></div>
                Revoking...
              </>
            ) : (
              'Revoke All Sessions'
            )}
          </button>
        )}
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don&apos;t have any active sessions at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`border rounded-lg p-4 ${
                session.is_current ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    {getDeviceIcon(session.device_info.device_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {session.device_info.browser} on {session.device_info.os}
                      </h4>
                      {session.is_current && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                      {getStatusIcon(session)}
                    </div>
                    
                    <div className="mt-1 text-sm text-gray-500 space-y-1">
                      <div className="flex items-center space-x-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>
                          {session.location.city && session.location.country
                            ? `${session.location.city}, ${session.location.country}`
                            : 'Unknown location'}
                          {session.location.is_vpn && (
                            <span className="ml-1 text-yellow-600">(VPN detected)</span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>Last used {formatDate(session.last_used)}</span>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        Created {formatDate(session.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {!session.is_current && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    disabled={revokingSession === session.id}
                    className="ml-4 inline-flex items-center px-2 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {revokingSession === session.id ? (
                      <>
                        <div className="animate-spin -ml-1 mr-1 h-3 w-3 border-2 border-red-300 border-t-red-600 rounded-full"></div>
                        Revoking...
                      </>
                    ) : (
                      'Revoke'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Security Notice</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                If you notice any suspicious activity or unrecognized sessions, 
                revoke those sessions immediately and consider changing your password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
