'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// Force dynamic rendering to avoid build issues
export const dynamic = 'force-dynamic';

export default function DebugAuthPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabaseBrowser.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event: any, session: Session | null) => {
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
              <h2 className="text-lg font-semibold text-yellow-900 mb-3">Environment Variables</h2>
              <div className="space-y-2 text-sm">
                <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}</p>
                <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
