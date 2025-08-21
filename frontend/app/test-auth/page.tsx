"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabaseBrowser } from "@/lib/supabase/client";
import { 
  isSupabaseConfigured, 
  transformSupabaseUser, 
  handleUserLoadError,
  type TransformedUser 
} from "@/lib/utils/auth-utils";
import { LoadingState } from "@/components/ui/LoadingState";

export default function TestAuthPage() {
  const [user, setUser] = useState<TransformedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setDebugInfo("Checking authentication...");
        
        // Use centralized configuration check
        if (!isSupabaseConfigured()) {
          setDebugInfo(prev => `${prev  }\nUsing placeholder Supabase configuration`);
          setIsLoading(false);
          return;
        }
        
        // Get user session using centralized approach
        const { data: { user }, error } = await supabaseBrowser.auth.getUser();
        
        if (error) {
          setDebugInfo(prev => `${prev  }\nAuth error: ${error.message}`);
          handleUserLoadError(error);
        } else if (user) {
          // Use centralized user transformation
          const userData = transformSupabaseUser(user);
          setUser(userData);
          setDebugInfo(prev => `${prev  }\nUser authenticated: ${user.email}`);
        } else {
          setDebugInfo(prev => `${prev  }\nNo user found`);
        }
        
        // Get session info
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        setDebugInfo(prev => `${prev  }\nSession: ${session ? 'active' : 'none'}`);
        
      } catch (error) {
        setDebugInfo(prev => `${prev  }\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
        handleUserLoadError(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      setUser(null);
      setDebugInfo(prev => `${prev  }\nSigned out successfully`);
    } catch (error) {
      setDebugInfo(prev => `${prev  }\nSign out error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return <LoadingState message="Testing Authentication..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Authentication Test</h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">User Status</h2>
            {user ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-800">
                  <strong>Authenticated:</strong> {user.email}
                </p>
                <p className="text-green-700 text-sm">ID: {user.id}</p>
                <p className="text-green-700 text-sm">Name: {user.name || 'Not set'}</p>
                <p className="text-green-700 text-sm">Provider: {user.provider}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">
                  <strong>Not Authenticated</strong>
                </p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Debug Information</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          </div>

          <div className="flex space-x-4">
            {user ? (
              <>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Sign Out
                </button>
                <Link
                  href="/profile/settings"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Go to Profile Settings
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Sign Up
                </Link>
              </>
            )}
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
