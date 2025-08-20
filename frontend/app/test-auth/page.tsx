'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function TestAuthPage() {
  const [authState, setAuthState] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check session
        const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
        setSession(sessionData);
        
        // Check user
        const { data: userData, error: userError } = await supabaseBrowser.auth.getUser();
        setUser(userData);
        
        // Set auth state
        setAuthState({
          hasSession: !!sessionData.session,
          hasUser: !!userData.user,
          sessionError: sessionError?.message,
          userError: userError?.message,
          sessionExpiry: sessionData.session?.expires_at,
          userEmail: userData.user?.email,
          userId: userData.user?.id
        });
        
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthState({ error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user);
        setAuthState({
          hasSession: !!session,
          hasUser: !!session?.user,
          event: event,
          userEmail: session?.user?.email,
          userId: session?.user?.id
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Checking authentication state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Test Page</h1>
          
          <div className="space-y-6">
            {/* Auth State */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">Authentication State</h2>
              <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(authState, null, 2)}
              </pre>
            </div>

            {/* Session Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">Session Info</h2>
              <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">User Info</h2>
              <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Sign Out
                </button>
                <br />
                <a
                  href="/auth/signin"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
                >
                  Go to Sign In
                </a>
                <br />
                <a
                  href="/profile/settings"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
                >
                  Go to Profile Settings
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
