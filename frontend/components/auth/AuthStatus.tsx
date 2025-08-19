"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider: string;
}

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Supabase session
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            image: session.user.user_metadata?.avatar_url,
            provider: "supabase"
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        // Auth state changed: event, session?.user?.email
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            image: session.user.user_metadata?.avatar_url,
            provider: "supabase"
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      setUser(null);
      // Redirect to home page after sign out
      router.push("/");
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/auth/signin"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        {user.image && (
          <img
            src={user.image}
            alt={user.name || user.email}
            className="h-8 w-8 rounded-full"
          />
        )}
        <div className="text-sm">
          <p className="font-medium text-gray-900">{user.name || user.email}</p>
          <p className="text-gray-500 text-xs">{user.provider}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Link
          href="/profile"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Profile
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
