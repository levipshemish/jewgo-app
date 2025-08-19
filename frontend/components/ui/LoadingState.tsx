'use client';

import { Loader2, Clock, RefreshCw } from 'lucide-react';
import React from 'react';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner', size = 'md', text = 'Loading...', className = '', fullScreen = false, }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const renderLoader = (): JSX.Element => {
    switch (type) {
      case 'spinner':
        return (
          <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
        );
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        );
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`} />
        );
      default:
        return (
          <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
        );
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoader()}
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '', height = 'h-4', width = 'w-full', rounded = true, }) => {
  return (
    <div
      className={`${height} ${width} bg-gray-200 animate-pulse ${
        rounded ? 'rounded' : ''
      } ${className}`}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 space-y-3 ${className}`}>
      <div className="flex items-center space-x-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
};

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({
  count = 3, className = '', }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export const LoadingOverlay: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
}> = ({ isLoading, children, text = 'Loading...' }) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
        <LoadingState text={text} />
      </div>
    </div>
  );
};

export const AsyncLoadingState: React.FC<{
  isLoading: boolean;
  error: Error | null;
  children: React.ReactNode;
  loadingText?: string;
  errorText?: string;
  onRetry?: () => void;
}> = ({
  isLoading, error, children, loadingText = 'Loading...', errorText = 'Something went wrong', onRetry, }) => {
  if (isLoading) {
    return <LoadingState text={loadingText} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
          <Clock className="w-6 h-6 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">{errorText}</h3>
          <p className="text-sm text-gray-600 mt-1">{error.message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export const PageLoadingState: React.FC<{ text?: string }> = ({ text = 'Loading page...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingState size="xl" text={text} />
        <p className="mt-4 text-sm text-gray-500">
          Please wait while we load your content
        </p>
      </div>
    </div>
  );
};

export const TableLoadingState: React.FC<{ columns?: number; rows?: number }> = ({
  columns = 5, rows = 5, }) => {
  return (
    <div className="overflow-hidden">
      <div className="bg-white shadow-sm rounded-lg">
        {/* Header skeleton */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        
        {/* Rows skeleton */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="flex space-x-4">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton key={colIndex} className="h-4 flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ButtonLoadingState: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}> = ({ isLoading, children, loadingText = 'Loading...', className = '' }) => {
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