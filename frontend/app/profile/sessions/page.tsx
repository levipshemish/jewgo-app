"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthSession {
  id: string;
  user_agent?: string;
  ip?: string;
  created_at: string;
  last_used: string;
  expires_at: string;
  is_current?: boolean;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  
  const { user: _user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push('/auth/signin');
    }
  }, [isAuthenticated, loading, router]);

  // Fetch user sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'}/api/auth/sessions`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch sessions');
        }

        const data = await response.json();
        setSessions(data.sessions || []);

      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated()) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  const revokeSession = async (sessionId: string) => {
    try {
      setRevoking(sessionId);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'}/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke session');
      }

      // Remove the session from the list
      setSessions(prev => prev.filter(s => s.id !== sessionId));

    } catch (err) {
      console.error('Error revoking session:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'}/api/auth/sessions/revoke-all`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke sessions');
      }

      // Keep only current session
      setSessions(prev => prev.filter(s => s.is_current));

    } catch (err) {
      console.error('Error revoking all sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke all sessions');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatUserAgent = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device';
    
    // Simple browser detection
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    
    // Mobile detection
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android Device';
    
    return 'Unknown Device';
  };

  if (!isAuthenticated() && !loading) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your active login sessions across different devices and browsers
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Sessions List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Your Sessions ({sessions.length})
            </h2>
            {sessions.filter(s => !s.is_current).length > 0 && (
              <button
                onClick={revokeAllOtherSessions}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Revoke All Other Sessions
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-200">
            {sessions.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">No active sessions found</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {formatUserAgent(session.user_agent)}
                            </h3>
                            {session.is_current && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Current Session
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 space-y-1">
                            <div>IP Address: {session.ip || 'Unknown'}</div>
                            <div>Created: {formatDate(session.created_at)}</div>
                            <div>Last Used: {formatDate(session.last_used)}</div>
                            <div>Expires: {formatDate(session.expires_at)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      {!session.is_current ? (
                        <button
                          onClick={() => revokeSession(session.id)}
                          disabled={revoking === session.id}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          {revoking === session.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-red-700 mr-1"></div>
                              Revoking...
                            </>
                          ) : (
                            'Revoke'
                          )}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500">This Session</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Security Information</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Sessions automatically expire after 45 days of inactivity</li>
                  <li>Revoking a session will log out that device immediately</li>
                  <li>Your current session cannot be revoked from this page</li>
                  <li>If you notice unfamiliar sessions, revoke them immediately</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            ← Back to Profile
          </button>
        </div>
      </div>
    </div>
  );
}
