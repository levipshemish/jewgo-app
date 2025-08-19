"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function TestAuthPage() {
  const [status, setStatus] = useState<string>("Loading...");
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setStatus("Checking Supabase connection...");
        
        // Check if environment variables are loaded
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        setStatus(`Environment check: URL=${!!supabaseUrl}, Key=${!!supabaseKey}`);
        
        // Try to get session
        const { data, error } = await supabaseBrowser.auth.getSession();
        
        if (error) {
          setError(`Session error: ${error.message}`);
          setStatus("Failed to get session");
        } else {
          setSession(data.session);
          setStatus("Connection successful");
        }
      } catch (err) {
        setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setStatus("Connection failed");
      }
    };
    
    checkAuth();
  }, []);

  const testSignIn = async () => {
    try {
      setStatus("Testing sign in...");
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: "test@example.com",
        password: "wrongpassword",
      });
      
      if (error) {
        setStatus(`Sign in test completed with expected error: ${error.message}`);
      } else {
        setStatus("Sign in test completed unexpectedly successfully");
      }
    } catch (err) {
      setError(`Sign in test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testGoogleOAuth = async () => {
    try {
      setStatus("Testing Google OAuth...");
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setStatus(`Google OAuth test error: ${error.message}`);
      } else {
        setStatus("Google OAuth initiated successfully");
      }
    } catch (err) {
      setError(`Google OAuth test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Test Page</h1>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Status</h2>
              <p className="text-blue-800">{status}</p>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
                <p className="text-red-800">{error}</p>
              </div>
            )}
            
            {session && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h2 className="text-lg font-semibold text-green-900 mb-2">Session</h2>
                <pre className="text-green-800 text-sm overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="space-y-2">
              <button
                onClick={testSignIn}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Test Email Sign In
              </button>
              
              <button
                onClick={testGoogleOAuth}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 ml-2"
              >
                Test Google OAuth
              </button>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Environment Variables</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}</p>
                <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
                <p>NODE_ENV: {process.env.NODE_ENV}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
