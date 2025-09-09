import React, { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import EateryPageClient from './EateryPageClient';
import ErrorBoundary from './components/ErrorBoundary';

// Loading component for Suspense fallback
function EateryPageLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <div className="h-16 bg-gray-100 animate-pulse"></div>
      
      {/* Navigation skeleton */}
      <div className="h-16 bg-gray-50 animate-pulse border-b border-gray-200"></div>
      
      {/* Grid skeleton */}
      <div className="flex-1 px-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
              {/* Image skeleton */}
              <div className="aspect-[4/3] bg-gray-200"></div>
              
              {/* Content skeleton */}
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom navigation skeleton */}
      <div className="h-16 bg-gray-100 animate-pulse"></div>
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
