'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

// Common interfaces
interface BaseLoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

interface LoadingSpinnerProps extends BaseLoadingProps {
  variant?: 'spinner' | 'dots' | 'pulse';
}

interface LoadingStateProps extends BaseLoadingProps {
  type?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
  lines?: number;
  variant?: 'text' | 'card' | 'avatar';
}

// Shared size classes
const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

// Shared render functions
const renderSpinner = (variant: string, sizeClass: string): JSX.Element => {
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

const renderLoader = (type: string, sizeClass: string): JSX.Element => {
  switch (type) {
    case 'spinner':
      return (
        <Loader2 className={`${sizeClass} animate-spin text-blue-600`} />
      );
    case 'dots':
      return (
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${sizeClass} bg-blue-600 rounded-full animate-pulse`}
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
        <div className={`${sizeClass} bg-blue-600 rounded-full animate-pulse`} />
      );
    default:
      return (
        <Loader2 className={`${sizeClass} animate-spin text-blue-600`} />
      );
  }
};

// Main LoadingSpinner component
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md', 
  variant = 'spinner', 
  text, 
  className = '', 
  fullScreen = false 
}) => {
  const sizeClass = sizeClasses[size];

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderSpinner(variant, sizeClass)}
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

// LoadingState component (alias for LoadingSpinner with different prop names)
export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner', 
  size = 'md', 
  text = 'Loading...', 
  className = '', 
  fullScreen = false 
}) => {
  const sizeClass = sizeClasses[size];

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoader(type, sizeClass)}
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

// Loading overlay component
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading, 
  children, 
  text = 'Loading...', 
  variant = 'spinner' 
}) => {
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
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '', 
  height = 'h-4', 
  width = 'w-full', 
  rounded = true,
  lines = 1,
  variant = 'text'
}) => {
  if (variant === 'card') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className={`${height} ${width} bg-gray-200 ${rounded ? 'rounded' : ''}`}></div>
        <div className="mt-2 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className={`h-3 bg-gray-200 ${rounded ? 'rounded' : ''}`} style={{ width: `${100 - (i * 10)}%` }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={`${height} ${width} bg-gray-200 rounded-full animate-pulse ${className}`}></div>
    );
  }

  // Default text variant
  return (
    <div
      className={`${height} ${width} bg-gray-200 animate-pulse ${
        rounded ? 'rounded' : ''
      } ${className}`}
    />
  );
};

// Skeleton card component
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 space-y-3 ${className}`}>
      <div className="flex items-center space-x-3">
        <Skeleton className="w-12 h-12 rounded-full" variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
};

// Export all components for backward compatibility
export default LoadingSpinner;
