"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { supabaseClient } from "@/lib/supabase/client-secure";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      try {
        await supabaseClient.auth.signOut();
        // Redirect to home page after successful sign out
        router.push("/");
      } catch (error) {
        console.error('Sign out error:', error);
        // Even if there's an error, redirect to home
        router.push("/");
      }
    };

    signOut();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing out...</p>
      </div>
    </div>
  );
}
