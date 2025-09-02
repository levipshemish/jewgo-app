import React, { Suspense } from 'react';
import EateryPageClient from './EateryPageClient';

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
    <Suspense fallback={<EateryPageLoading />}>
      <EateryPageClient />
    </Suspense>
  );
}
