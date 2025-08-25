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
            // No user found
            setIsGuest(false);
            setUser(null);
            const redirectPath = redirectTo ? `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/signin';
            router.push(redirectPath);
          }
        } else {
          // API error, redirect to sign-in
          setIsGuest(false);
          setUser(null);
          const redirectPath = redirectTo ? `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/signin';
          router.push(redirectPath);
        }
      } catch (error) {
        console.error('Error checking user authentication:', error);
        setIsGuest(false);
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

/**
 * Component wrapper for guest user protection
 * Shows loading state and redirects guest users
 */
export function GuestProtectionWrapper({ 
  children, 
  redirectTo,
  loadingComponent 
}: { 
  children: React.ReactNode;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
}) {
  const { isLoading, isGuest } = useGuestProtection(redirectTo);

  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600 mb-4">Guest users must sign in to access this feature.</p>
          <p className="text-sm text-gray-500">Redirecting to sign-in...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
