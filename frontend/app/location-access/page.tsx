"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { postgresAuth } from "@/lib/auth/postgres-auth";
import { useLocation } from "@/lib/contexts/LocationContext";
import LocationAccess from "@/components/location/LocationAccess";

export default function LocationAccessPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const { setLocation, setPermissionStatus } = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authState = typeof postgresAuth.getCachedAuthState === 'function'
          ? postgresAuth.getCachedAuthState()
          : (postgresAuth.isAuthenticated() ? 'authenticated' : 'unauthenticated');

        if (authState === 'unauthenticated') {
          router.push('/auth/signin');
          return;
        }

        if (authState === 'unknown' || authState === 'guest') {
          const profile = await postgresAuth.getProfile();
          if (!profile || profile.is_guest) {
            router.push('/auth/signin');
            return;
          }
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
    // Use LocationContext to store location data
    setLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: Date.now()
    });
    setPermissionStatus('granted');
  };

  const handleLocationDenied = () => {
    // Use LocationContext to set permission status
    setPermissionStatus('denied');
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
