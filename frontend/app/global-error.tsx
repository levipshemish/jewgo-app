"use client";

// Temporarily disable Sentry to fix Edge Runtime module conflicts
// import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { appLogger } from '@/lib/utils/logger';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Temporarily disabled Sentry to fix Edge Runtime module conflicts
    // try {
    //   Sentry.captureException(error);
    // } catch (sentryError) {
    //   // Fallback logging for when Sentry fails
    //   console.error('Global error caught:', error);
    //   console.error('Sentry error:', sentryError);
    // }
    
    // Simple error logging for now
    appLogger.error('Global error caught', { error: String(error) });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Something went wrong!</h2>
            <p className="text-gray-600 mb-8">An error occurred while loading this page.</p>
            <button
              onClick={() => {
                // Temporarily disabled to debug infinite reload issue
                console.log('Global error handler: Try again button clicked - but reload disabled for debugging');
                // Prevent infinite reload loops by tracking reload attempts
                const reloadCount = Number(sessionStorage.getItem('errorReloadCount') || '0');
                if (reloadCount < 3) {
                  sessionStorage.setItem('errorReloadCount', String(reloadCount + 1));
                  // TEMPORARILY DISABLED: window.location.reload();
                  console.log('Would reload page, but disabled for debugging');
                } else {
                  // After 3 reload attempts, navigate to home instead
                  // TEMPORARILY DISABLED: window.location.href = '/';
                  console.log('Would navigate to home, but disabled for debugging');
                }
              }}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again (Debug Mode)
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
