"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthStatus from "@/components/auth/AuthStatus";

interface NeonUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TestSupabasePage() {
  const [authStatus, setAuthStatus] = useState<string>("Loading...");
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [envVars, setEnvVars] = useState<any>({});
  const [neonUser, setNeonUser] = useState<NeonUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const envStatus = {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        };
        setEnvVars(envStatus);

        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        if (error) { setAuthStatus(`Error: ${error.message}`); return; }
        if (session && session.user) {
          setAuthStatus("✅ User authenticated!");
          setUser(session.user);
          setSession(session);
          
          // Try to get Neon user data
          try {
            const response = await fetch('/api/auth/sync-user');
            if (response.ok) {
              const data = await response.json();
              setNeonUser(data.user);
              setSyncStatus("✅ User synced with Neon database");
            } else {
              setSyncStatus("⚠️ User not found in Neon database");
            }
          } catch (err) {
            setSyncStatus("❌ Failed to check Neon user data");
          }
        } else { setAuthStatus("❌ Auth session missing!"); }
      } catch (error) { setAuthStatus(`Error: ${error}`); }
    };
    checkAuth();

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setAuthStatus("✅ User authenticated!");
          setUser(session.user);
          setSession(session);
          
          // Sync user data when signed in
          try {
            const response = await fetch('/api/auth/sync-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                avatar_url: session.user.user_metadata?.avatar_url,
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              setNeonUser(data.user);
              setSyncStatus("✅ User synced with Neon database");
            } else {
              setSyncStatus("⚠️ Failed to sync user data");
            }
          } catch (err) {
            setSyncStatus("❌ Failed to sync user data");
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthStatus("❌ Auth session missing!");
          setUser(null);
          setSession(null);
          setNeonUser(null);
          setSyncStatus("");
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabaseBrowser.auth.signOut();
      if (error) { console.error('Sign out error:', error); }
      else { window.location.href = "/"; }
    } catch (err) { console.error('Sign out error:', err); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Supabase Authentication Test
          </h1>
          <p className="text-xl text-gray-600">
            Testing Supabase authentication and user synchronization
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Supabase Auth Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              🔐 Supabase Authentication
            </h2>
            <AuthStatus />
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold text-gray-900 mb-2">Status:</h3>
              <p className="text-sm text-gray-600">{authStatus}</p>
            </div>

            {user && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <h3 className="font-semibold text-blue-900 mb-2">User Details:</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Name:</strong> {user.user_metadata?.full_name || user.user_metadata?.name || 'N/A'}</p>
                  <p><strong>Provider:</strong> {user.app_metadata?.provider || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Neon Database Sync */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              🗄️ Neon Database Sync
            </h2>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold text-gray-900 mb-2">Sync Status:</h3>
              <p className="text-sm text-gray-600">{syncStatus || "Checking..."}</p>
            </div>

            {neonUser && (
              <div className="mt-4 p-4 bg-green-50 rounded-md">
                <h3 className="font-semibold text-green-900 mb-2">Neon User Data:</h3>
                <div className="text-sm text-green-800 space-y-1">
                  <p><strong>ID:</strong> {neonUser.id}</p>
                  <p><strong>Email:</strong> {neonUser.email}</p>
                  <p><strong>Name:</strong> {neonUser.name || 'N/A'}</p>
                  <p><strong>Admin:</strong> {neonUser.isSuperAdmin ? 'Yes' : 'No'}</p>
                  <p><strong>Created:</strong> {new Date(neonUser.createdAt).toLocaleDateString()}</p>
                  <p><strong>Updated:</strong> {new Date(neonUser.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Environment Variables */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            ⚙️ Environment Variables
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">Supabase URL</p>
              <p className="text-sm text-gray-600">{envVars.supabaseUrl ? '✅ Set' : '❌ Missing'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">Supabase Anon Key</p>
              <p className="text-sm text-gray-600">{envVars.supabaseAnonKey ? '✅ Set' : '❌ Missing'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">Service Role Key</p>
              <p className="text-sm text-gray-600">{envVars.supabaseServiceKey ? '✅ Set' : '❌ Missing'}</p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/auth/supabase-signin"
            className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </a>
          <a
            href="/auth/supabase-signup"
            className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Sign Up
          </a>
          <a
            href="/eatery"
            className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Go to App
          </a>
          {user && (
            <button
              onClick={handleSignOut}
              className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Phase Status */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📊 Migration Phase Status
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>✅ <strong>Phase 1:</strong> Supabase Auth Integration - Complete</p>
            <p>🔄 <strong>Phase 2:</strong> User Data Synchronization - In Progress</p>
            <p>⏳ <strong>Phase 3:</strong> User Migration - Pending</p>
            <p>⏳ <strong>Phase 4:</strong> NextAuth.js Removal - Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}
