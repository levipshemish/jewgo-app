"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { postgresAuth } from "@/lib/auth/postgres-auth";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Sign out from PostgreSQL auth
        await postgresAuth.signOut();
        
        // Redirect to signin page
        router.push('/auth/signin');
      } catch (error) {
        console.error('Logout failed:', error);
        // Still redirect to signin page even if logout fails
        router.push('/auth/signin');
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jewgo-400 mx-auto mb-4"></div>
        <p className="text-neutral-400">Signing out...</p>
      </div>
    </div>
  );
}
