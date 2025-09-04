import React, { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import EateryPageClient from './EateryPageClient';
import ErrorBoundary from './components/ErrorBoundary';

// Loading component for Suspense fallback
function EateryPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Main server component
export default function EateryPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<EateryPageLoading />}>
        <EateryPageClient />
      </Suspense>
    </ErrorBoundary>
  );
}
