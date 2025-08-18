import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md', variant = 'spinner', text, className = '', fullScreen = false, }) => {
  const sizeClass = sizeClasses[size];

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className={`${sizeClass} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${sizeClass} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${sizeClass} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeClass} bg-blue-600 rounded-full animate-pulse`}></div>
        );
      
      case 'spinner':
      default:
        return <Loader2 className={`${sizeClass} animate-spin text-blue-600`} />;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderSpinner()}
      {text && (
        <p className="mt-2 text-sm text-gray-600 text-center">{text}</p>
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

// Loading overlay component
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading, children, text = 'Loading...', variant = 'spinner', }) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
        <LoadingSpinner text={text} variant={variant} size="lg" />
      </div>
    </div>
  );
};

// Skeleton loading component
interface SkeletonProps {
  className?: string;
  lines?: number;
  variant?: 'text' | 'card' | 'avatar';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '', lines = 1, variant = 'text', }) => {
  if (variant === 'card') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-full h-12 w-12"></div>
      </div>
    );
  }

  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 rounded mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  );
};

// Restaurant card skeleton
export const RestaurantCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse">
      <div className="aspect-[4/3] bg-gray-200"></div>
      <div className="p-5">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
};

// Restaurant grid skeleton
export const RestaurantGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <RestaurantCardSkeleton key={index} />
      ))}
    </>
  );
};

// Infinite scroll loading indicator
export const InfiniteScrollLoader: React.FC<{ hasMore: boolean; isLoading: boolean }> = ({
  hasMore, isLoading, }) => {
  if (!hasMore) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No more restaurants to load</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner text="Loading more restaurants..." variant="dots" />
      </div>
    );
  }

  return null;
};

// Pull to refresh indicator
export const PullToRefreshIndicator: React.FC<{ isRefreshing: boolean }> = ({
  isRefreshing, }) => {
  if (!isRefreshing) {return null;}

  return (
    <div className="flex items-center justify-center py-4 text-gray-600">
      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
      <span className="text-sm">Refreshing...</span>
    </div>
  );
};

export default LoadingSpinner; 