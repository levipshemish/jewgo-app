"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
      onSignedOut?.();
      router.push(redirectTo);
    } catch (e) {
      console.error("Sign out failed", e);
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

