"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SupabaseSignIn() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main unified signin page
    router.replace('/auth/signin');
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jewgo-400 mx-auto mb-4"></div>
        <p className="text-neutral-400">Redirecting to unified signin page...</p>
      </div>
    </div>
  );
}
