"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuth as useAuthContext } from "@/contexts/AuthContext";

interface SignOutButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  redirectTo?: string;
  onSignedOut?: () => void;
  variant?: "link" | "button" | "danger";
}

/**
 * Reusable sign-out button that calls the server route and redirects.
 */
export default function SignOutButton({
  label = "Sign Out",
  redirectTo = "/",
  onSignedOut,
  variant = "button",
  className = "",
  disabled,
  children,
  ...rest
}: SignOutButtonProps) {
  const [loading, setLoading] = useState(false);
  const { signOut } = useAuth();
  const authContext = useAuthContext();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      console.log('SignOutButton: Starting direct logout...');
      
      // Try normal signout first, then force logout if needed
      try {
        const response = await fetch("/api/auth/signout", { 
          method: "POST", 
          credentials: "include" 
        });
        const result = await response.json().catch(() => ({}));
        console.log('SignOutButton: Normal signout response:', result);
        
        // If normal signout fails, try force logout
        if (!result.success) {
          console.log('SignOutButton: Normal signout failed, trying force logout...');
          const forceResponse = await fetch("/api/auth/force-logout", { 
            method: "POST", 
            credentials: "include" 
          });
          const forceResult = await forceResponse.json().catch(() => ({}));
          console.log('SignOutButton: Force logout response:', forceResult);
        }
      } catch (apiError) {
        console.warn('SignOutButton: All API signout attempts failed:', apiError);
      }
      
      // Call both auth contexts to ensure all state is cleared
      try {
        await signOut();
        console.log('SignOutButton: useAuth signOut completed');
      } catch (e) {
        console.warn('SignOutButton: useAuth signOut failed:', e);
      }
      
      try {
        await authContext.logout();
        console.log('SignOutButton: AuthContext logout completed');
      } catch (e) {
        console.warn('SignOutButton: AuthContext logout failed:', e);
      }
      
      // Clear any remaining browser state aggressively
      try {
        if (typeof window !== 'undefined') {
          // Clear all storage
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear visible cookies
          document.cookie.split(";").forEach((c) => { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, `=;expires=${  new Date().toUTCString()  };path=/`); 
          });
          
          console.log('SignOutButton: Browser state cleared');
        }
      } catch (e) {
        console.warn('SignOutButton: Failed to clear browser state:', e);
      }
      
      onSignedOut?.();
      console.log('SignOutButton: Forcing complete page reload to', redirectTo);
      
      // Force complete page reload to ensure all state is cleared
      window.location.href = redirectTo;
      
    } catch (e) {
      console.error("SignOutButton: Complete sign out failed", e);
      
      // Nuclear option: force redirect regardless
      onSignedOut?.();
      window.location.href = redirectTo;
      
    } finally {
      setLoading(false);
    }
  };

  const baseClasses =
    variant === "link"
      ? "text-sm text-gray-600 hover:text-gray-900"
      : variant === "danger"
      ? "px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
      : "px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseClasses} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {children ?? (loading ? "Signing out..." : label)}
    </button>
  );
}

