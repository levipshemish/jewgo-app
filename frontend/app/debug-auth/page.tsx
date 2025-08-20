'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Force dynamic rendering to avoid build issues
export const dynamic = 'force-dynamic';

export default function DebugAuthPage() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check session
        const { data: { session: sessionData } } = await supabaseBrowser.auth.getSession();
        setSession(sessionData);

        // Check user
        const { data: { user: userData } } = await supabaseBrowser.auth.getUser();
        setUser(userData);

        // Check cookies
        const cookieString = document.cookie;
        setCookies(cookieString);

      } catch (_error) {
        // Auth check error
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await supabaseBrowser.auth.signInWithPassword({
        email: 'mendel1023@gmail.com',
        password: 'your-password-here' // You'll need to enter this
      });
    } catch {
      // Sign in error
    }
  };

  const handleSignOut = async () => {
    try {
      await supabaseBrowser.auth.signOut();
    } catch {
      // Sign out error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading auth data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Auth Debug Page</h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">Authentication Status</h2>
              <div className="space-y-2">
                <p><strong>Has Session:</strong> {session ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Has User:</strong> {user ? '✅ Yes' : '❌ No'}</p>
                {user && (
                  <p><strong>User Email:</strong> {user.email}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">Session Data</h2>
              <pre className="text-sm bg-white p-3 rounded border overflow-auto max-h-40">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">User Data</h2>
              <pre className="text-sm bg-white p-3 rounded border overflow-auto max-h-40">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">Cookies</h2>
              <pre className="text-sm bg-white p-3 rounded border overflow-auto max-h-20">
                {cookies || 'No cookies found'}
              </pre>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-900 mb-3">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={handleSignIn}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
                >
                  Test Sign In
                </button>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Sign Out
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-yellow-900 mb-3">Test Links</h2>
              <div className="space-y-2">
                <a
                  href="/profile/settings"
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 inline-block mr-2"
                >
                  Try Profile Settings
                </a>
                <a
                  href="/test-profile"
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 inline-block"
                >
                  Test Profile Page
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
