"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { transformSupabaseUser, type TransformedUser } from "@/lib/utils/auth-utils";

interface AuthStatusProps {
  className?: string;
}

export default function AuthStatus({ className = "" }: AuthStatusProps) {
  const [user, setUser] = useState<TransformedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Securely fetch authenticated user
        const { data: { user } } = await supabaseBrowser.auth.getUser();
        if (user) {
          setUser(transformSupabaseUser(user));
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
      async (_event: string) => {
        try {
          // Re-fetch user to avoid trusting session payload
          const { data: { user } } = await supabaseBrowser.auth.getUser();
          if (user) {
            setUser(transformSupabaseUser(user));
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
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
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.name || user.email}
            className="h-8 w-8 rounded-full"
          />
        )}
        <span className="text-sm font-medium text-gray-700">
          {user.name || user.email}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Link
          href="/profile"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Profile
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
