'use client';

// Keep any additional components that are specific to this file
import React from 'react';

interface LoadingStateProps {
  className?: string;
  message?: string;
  showSpinner?: boolean;
}

/**
 * Reusable loading state component to eliminate duplicated loading UI
 * across profile pages and other components
 */
export function LoadingState({ 
  className = "", 
  message = "Loading...",
  showSpinner = true 
}: LoadingStateProps) {
  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
        
        {showSpinner && (
          <div className="text-center mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact loading state for smaller components
 */
export function CompactLoadingState({ 
  className = "", 
  message = "Loading..." 
}: Omit<LoadingStateProps, 'showSpinner'>) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
} 