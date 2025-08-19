'use client';

// Keep any additional components that are specific to this file
import React from 'react';
import { LoadingState } from './Loading';
import { SkeletonCard } from './LoadingStates';
import { Loader2 } from 'lucide-react';

// Loading state wrapper for async operations
interface AsyncLoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  children: React.ReactNode;
  loadingText?: string;
  errorText?: string;
}

export const AsyncLoadingState: React.FC<AsyncLoadingStateProps> = ({
  isLoading,
  error,
  children,
  loadingText = 'Loading...',
  errorText = 'An error occurred'
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingState text={loadingText} type="spinner" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-600">
        <p>{errorText}: {error}</p>
      </div>
    );
  }

  return <>{children}</>;
};

// Loading state for data fetching
interface DataLoadingStateProps {
  data: any[] | null;
  isLoading: boolean;
  error?: string | null;
  children: React.ReactNode;
  emptyText?: string;
}

export const DataLoadingState: React.FC<DataLoadingStateProps> = ({
  data,
  isLoading,
  error,
  children,
  emptyText = 'No data available'
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>{emptyText}</p>
      </div>
    );
  }

  return <>{children}</>;
};

// Button loading state component
interface ButtonLoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export const ButtonLoadingState: React.FC<ButtonLoadingStateProps> = ({
  isLoading, 
  children, 
  loadingText = 'Loading...', 
  className = '' 
}) => {
  return (
    <button
      disabled={isLoading}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {isLoading ? loadingText : children}
    </button>
  );
};

export default LoadingState; 