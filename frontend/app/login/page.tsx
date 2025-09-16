'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy login redirect page
 * Redirects /login to /auth/signin for backward compatibility
 * This prevents 404 errors and infinite loops when old URLs are used
 */
function LoginRedirectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve any query parameters when redirecting
    const redirectTo = searchParams.get('redirectTo');
    const returnTo = searchParams.get('returnTo');
    
    let targetUrl = '/auth/signin';
    
    // Preserve redirect parameters
    if (redirectTo) {
      targetUrl += `?redirectTo=${encodeURIComponent(redirectTo)}`;
    } else if (returnTo) {
      targetUrl += `?returnTo=${encodeURIComponent(returnTo)}`;
    }
    
    router.replace(targetUrl);
  }, [router, searchParams]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
    </div>
  );
}

export default function LoginRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <LoginRedirectPageContent />
    </Suspense>
  );
}
