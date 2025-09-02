import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email?: string;
  provider?: string;
}

interface GuestProtectionResult {
  isLoading: boolean;
  isGuest: boolean;
  user: User | null;
}

/**
 * Hook to protect pages from guest user access
 * Guest users (no email, provider unknown) are redirected to sign-in
 * @param redirectTo - Optional redirect path after sign-in
 * @returns Object with loading state, guest status, and user data
 */
export function useGuestProtection(redirectTo?: string): GuestProtectionResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch('/api/auth/sync-user', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          
          if (userData.user) {
            // Check if user is a guest user (no email, provider unknown)
            const guestUser = !userData.user.email && userData.user.provider === 'unknown';
            
            if (guestUser) {
              setIsGuest(true);
              setUser(userData.user);
              // Redirect guest users to sign-in
              const redirectPath = redirectTo ? `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/signin';
              router.push(redirectPath);
            } else {
              // Authenticated user with email
              setIsGuest(false);
              setUser(userData.user);
            }
          } else {
            // No user found - allow access but mark as guest
            setIsGuest(true);
            setUser(null);
            const redirectPath = redirectTo ? `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/signin';
            router.push(redirectPath);
          }
        } else {
          // API error, allow access but mark as guest
          setIsGuest(true);
          setUser(null);
          const redirectPath = redirectTo ? `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/signin';
          router.push(redirectPath);
        }
      } catch (error) {
        console.error('Error checking user authentication:', error);
        // On error, allow access but mark as guest
        setIsGuest(true);
        setUser(null);
        const redirectPath = redirectTo ? `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/signin';
        router.push(redirectPath);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [router, redirectTo]);

  return { isLoading, isGuest, user };
}


