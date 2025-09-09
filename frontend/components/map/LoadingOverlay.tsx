/**
 * Loading Overlay - Visual Loading State
 * 
 * Shows loading progress for the map.
 */

'use client';

import React from 'react';
import { useLivemapStore, sel } from '@/lib/stores/livemap-store';

interface LoadingOverlayProps {
  className?: string;
}

export default function LoadingOverlay({ className = '' }: LoadingOverlayProps) {
  const loading = useLivemapStore(sel.loading);
  const error = useLivemapStore(sel.error);

  const isLoading = loading.restaurants === 'pending';
  const hasError = loading.restaurants === 'error' && error;

  // Only show loading overlay for initial load, not for every map movement
  if (!isLoading && !hasError) {
    return null;
  }

  return (
    <div className={`absolute top-20 left-4 right-4 z-10 ${className}`}>
      {/* Loading State */}
      {isLoading && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 border">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">
                Loading restaurants...
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Fetching data for current viewport
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-800">
                Failed to load restaurants
              </div>
              <div className="text-xs text-red-600 mt-1">
                {error}
              </div>
            </div>
            <button
              onClick={() => {
                // Retry loading
                const bounds = useLivemapStore.getState().map.bounds;
                if (bounds) {
                  useLivemapStore.setState((s) => ({ 
                    loading: { ...s.loading, restaurants: 'pending' },
                    error: null 
                  }));
                  // Trigger reload
                  window.location.reload();
                }
              }}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
