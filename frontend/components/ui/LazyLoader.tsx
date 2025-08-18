'use client';

import React, { Suspense, lazy } from 'react';

interface LazyLoaderProps {
  component: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  props?: Record<string, any>;
}

const defaultFallback = (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
  </div>
);

export function LazyLoader({ 
  component, fallback = defaultFallback, props = {} 
}: LazyLoaderProps) {
  const LazyComponent = lazy(component);

  return (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Predefined lazy components for common use cases
export const LazyMap = lazy(() => import('@/components/map/InteractiveRestaurantMap'));
export const LazyAnalytics = lazy(() => import('@/components/analytics/Analytics'));
export const LazyImageCarousel = lazy(() => import('@/components/restaurant/ImageCarousel'));
export const LazyReviews = lazy(() => import('@/components/reviews/ReviewForm'));
