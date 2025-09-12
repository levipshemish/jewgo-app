'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';

import UnifiedRestaurantCard from '@/components/restaurant/UnifiedRestaurantCard';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { createFilterKey } from '@/lib/filters/utils';
import { Restaurant } from '@/lib/types/restaurant';

interface ProductResultsProps {
  appliedFilters: AppliedFilters;
  onResultsUpdate?: (results: Restaurant[], total: number) => void;
  // When set to 'hidden', this component will fetch and notify via onResultsUpdate but not render its own grid/UI
  displayMode?: 'grid' | 'hidden';
}

const fetcher = async (url: string, filters: AppliedFilters) => {
  // Convert filters to URL parameters for unified API
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v.toString()));
      } else {
        params.append(key, value.toString());
      }
    }
  });
  
  // Use v5 API endpoint
  const unifiedUrl = `/api/v5/restaurants?${params.toString()}`;
  
  const { unifiedApiCall } = await import('@/lib/utils/unified-api');
  const result = await unifiedApiCall(unifiedUrl, {
    ttl: 2 * 60 * 1000, // 2 minutes cache
    deduplicate: true,
    retry: true,
    retryAttempts: 2,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch restaurants');
  }

  return result.data;
};

const ProductResults: React.FC<ProductResultsProps> = ({ 
  appliedFilters, onResultsUpdate, displayMode = 'grid', }) => {
  // Create a stable key for SWR based on applied filters
  const key = useMemo(() => {
    const filterKey = createFilterKey(appliedFilters);
    return filterKey ? ['/api/restaurants/unified', filterKey] : null;
  }, [appliedFilters]);

  const { data, isLoading, isValidating, error } = useSWR(
    key,
    ([url, _filterKey]) => fetcher(url, appliedFilters),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Notify parent of results update
  React.useEffect(() => {
    if (data && onResultsUpdate) {
      onResultsUpdate(data.data || [], data.total || 0);
    }
  }, [data, onResultsUpdate]); // Include onResultsUpdate to satisfy exhaustive-deps

  if (isLoading && !data) {
    if (displayMode === 'hidden') {return null;}
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-xl h-48 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    if (displayMode === 'hidden') {return null;}
    return (
      <div className="text-center py-16">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load restaurants</h3>
        <p className="text-gray-600 mb-6">Please try again later</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const restaurants = data?.data || [];
  const total = data?.total || 0;

  if (restaurants.length === 0) {
    if (displayMode === 'hidden') {return null;}
    return (
      <div className="text-center py-16 lg:py-24">
        <div className="text-gray-400 text-6xl lg:text-8xl mb-4 lg:mb-6">🍽️</div>
        <div className="text-gray-500 text-lg lg:text-xl mb-3 font-medium">
          No restaurants found
        </div>
        <div className="text-gray-400 text-sm lg:text-base">
          Try adjusting your filters
        </div>
      </div>
    );
  }

  if (displayMode === 'hidden') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Results Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
        {restaurants.map((restaurant: Restaurant) => (
          <div key={restaurant.id} className="relative">
            <UnifiedRestaurantCard
              restaurant={restaurant}
              variant="eatery"
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* Loading indicator for revalidation */}
      {isValidating && (
        <div className="flex justify-center items-center py-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Updating results...</span>
          </div>
        </div>
      )}

      {/* Results summary */}
      <div className="text-sm text-gray-500 text-center">
        Showing {restaurants.length} of {total} restaurants
      </div>
    </div>
  );
};

export default ProductResults;
