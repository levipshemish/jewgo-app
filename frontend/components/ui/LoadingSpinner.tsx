// Re-export from unified Loading component
export { LoadingSpinner, LoadingOverlay, Skeleton } from './Loading';

// Keep the additional components that are specific to this file
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { LoadingSpinner } from './Loading';

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