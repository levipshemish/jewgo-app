import React, { forwardRef } from 'react';

interface LoadMoreSentinelProps {
  hasMore: boolean;
  isLoading?: boolean;
  onRetry?: () => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * LoadMoreSentinel component for infinite scroll functionality
 * Provides proper accessibility and reusability
 */
export const LoadMoreSentinel = forwardRef<HTMLDivElement, LoadMoreSentinelProps>(
  ({ hasMore, isLoading = false, onRetry, className = '', 'aria-label': ariaLabel }, ref) => {
    if (!hasMore) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={`load-more-sentinel ${className}`}
        aria-hidden={onRetry ? undefined : true}
        style={{ height: 1 }}
        role="presentation"
        aria-label={ariaLabel || 'Load more content sentinel'}
      >
        {/* Optional retry button for failed loads */}
        {onRetry && (
          <div className="flex justify-center py-4">
            <button
              onClick={onRetry}
              disabled={isLoading}
              className="px-4 py-2 border rounded bg-white hover:bg-gray-50 text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Retry loading more content"
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    );
  }
);

LoadMoreSentinel.displayName = 'LoadMoreSentinel';

export default LoadMoreSentinel;
