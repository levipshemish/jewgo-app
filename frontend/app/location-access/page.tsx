"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { postgresAuth } from "@/lib/auth/postgres-auth";
import LocationAccess from "@/components/location/LocationAccess";

export default function LocationAccessPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!postgresAuth.isAuthenticated()) {
          // Redirect to sign in if not authenticated
          router.push('/auth/signin');
          return;
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/signin');
      }
    };

    checkAuth();
  }, [router]);

  const handleLocationGranted = (coords: { latitude: number; longitude: number }) => {
    // Store location in localStorage or state management
    localStorage.setItem('userLocation', JSON.stringify(coords));
    localStorage.setItem('locationRequested', 'true');
    // eslint-disable-next-line no-console

  };

  const handleLocationDenied = () => {
    // Mark that location was requested (even if denied)
    localStorage.setItem('locationRequested', 'true');
    // eslint-disable-next-line no-console

    // User can still use the app without location
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jewgo-400 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to sign in
  }

  return (
    <LocationAccess
      onLocationGranted={handleLocationGranted}
      onLocationDenied={handleLocationDenied}
      redirectTo="/eatery"
    />
  );
}
