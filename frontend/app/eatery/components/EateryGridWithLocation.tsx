/**
 * EateryGridWithLocation - Example implementation using the new location utilities
 * 
 * This is an example of how to use the new location utility system.
 * It demonstrates the recommended patterns for location-aware components.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, RefObject } from 'react';
import Card from '@/components/core/cards/Card';
import { Loader2, Search } from 'lucide-react';
import { AppliedFilters } from '@/lib/filters/filters.types';
import type { LightRestaurant } from '../types';
import { useLocationData } from '@/hooks/useLocationData';
import { LocationWithDistance } from '@/lib/utils/location';

// Extend LightRestaurant to include location data, resolving the distance type conflict
interface EateryWithLocation extends Omit<LightRestaurant, 'distance'>, Omit<LocationWithDistance, 'distance'> {
  distance?: string; // Use string format for display (e.g., "1.5 miles")
}

interface EateryGridWithLocationProps {
  category?: string;
  searchQuery?: string;
  showDistance?: boolean;
  showRating?: boolean;
  showServices?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement>;
  useRealData?: boolean;
  activeFilters?: AppliedFilters;
  onCardClick?: (restaurant: LightRestaurant) => void;
}

export default function EateryGridWithLocation({
  category = "all",
  searchQuery = "",
  showDistance: _showDistance = true,
  showRating: _showRating = true,
  showServices: _showServices = true,
  scrollContainerRef: _scrollContainerRef,
  useRealData = true,
  activeFilters: _activeFilters = {},
  onCardClick
}: EateryGridWithLocationProps) {
  const [restaurants, setRestaurants] = useState<EateryWithLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [_page, setPage] = useState(0);
  const [backendError, setBackendError] = useState(false);
  const _isRetryingRef = useRef(false);

  // Use the new location utility hook
  const {
    userLocation,
    permissionStatus,
    isLoading: _locationLoading,
    error: _locationError,
    requestLocation: _requestLocation,
    transformItems,
    sortItems,
    getItemDisplayText
  } = useLocationData<EateryWithLocation>({
    sortByDistance: true, // Automatically sort by distance
    fallbackText: 'Get Location'
  });

  // Debug logging removed

  // Fetch restaurants from API
  const fetchRestaurants = useCallback(async (limit: number, offset: number = 0, params?: string, timeoutMs: number = 8000) => {
    try {
      const apiUrl = new URL('/api/v5/restaurants', window.location.origin);
      apiUrl.searchParams.set('limit', limit.toString());
      apiUrl.searchParams.set('offset', offset.toString());
      apiUrl.searchParams.set('include_reviews', 'true'); // Include Google reviews for consistent rating calculation

      if (params) {
        const searchParams = new URLSearchParams(params);
        searchParams.forEach((value, key) => {
          if (value && value.trim() !== '') {
            apiUrl.searchParams.set(key, value);
          }
        });
      }


      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(apiUrl.toString(), {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const restaurantsData = data.data?.restaurants || data.restaurants || [];
      const total = data.data?.total || data.total || 0;
      const hasMoreData = data.pagination?.hasMore || (offset + limit) < total;


      return {
        restaurants: restaurantsData,
        hasMore: hasMoreData,
        total
      };
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }
  }, []);

  // Load initial restaurants
  useEffect(() => {
    if (useRealData) {
      const loadInitialRestaurants = async () => {
        setLoading(true);
        setBackendError(false);
        try {
          const result = await fetchRestaurants(24, 0);
          setRestaurants(result.restaurants);
          setHasMore(result.hasMore);
          setPage(0);
        } catch (error) {
          console.error('Failed to load initial restaurants:', error);
          setBackendError(true);
        } finally {
          setLoading(false);
        }
      };

      loadInitialRestaurants();
    }
  }, [useRealData, fetchRestaurants]);

  // Transform and sort restaurants with location data
  const processedRestaurants = useMemo(() => {
    // Transform restaurants to include distance calculations
    const transformed = transformItems(restaurants);
    
    // Sort by distance if user location is available
    const sorted = sortItems(transformed);
    
    return sorted;
  }, [restaurants, transformItems, sortItems]);

  // Filter restaurants based on category and search
  const filteredRestaurants = useMemo(() => {
    return processedRestaurants.filter(restaurant => {
      // Category filter
      if (category !== "all") {
        if (restaurant.kosher_category?.toLowerCase() !== category.toLowerCase()) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          restaurant.name?.toLowerCase().includes(query) ||
          restaurant.address?.toLowerCase().includes(query) ||
          restaurant.kosher_category?.toLowerCase().includes(query) ||
          restaurant.cuisine?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [processedRestaurants, category, searchQuery]);

  // Handle card click
  const handleCardClick = (restaurant: EateryWithLocation) => {
    if (onCardClick) {
      // Convert EateryWithLocation back to LightRestaurant for callback compatibility
      const lightRestaurant: LightRestaurant = {
        ...restaurant,
        distance: parseFloat(restaurant.distance || '0') || 0
      };
      onCardClick(lightRestaurant);
    } else {
      // Default navigation
      window.location.href = `/eatery/${restaurant.id}`;
    }
  };

  // Helper function to format rating
  const toFixedRating = (rating: number | string | undefined): string => {
    if (rating === undefined || rating === null) return '';
    const numRating = typeof rating === 'number' ? rating : Number.parseFloat(String(rating));
    return Number.isFinite(numRating) ? numRating.toFixed(1) : '';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading restaurants...</span>
      </div>
    );
  }

  if (backendError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Failed to load restaurants. Please try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (filteredRestaurants.length === 0) {
    return (
      <div className="text-center py-8">
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No restaurants found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location status indicator */}
      {userLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-800 text-sm">
            📍 Showing distances from your location
          </p>
        </div>
      )}

      {!userLocation && permissionStatus === 'granted' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-sm">
            📍 Location permission granted, getting your location...
          </p>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredRestaurants.map((restaurant, index) => {
          const displayText = getItemDisplayText(restaurant);
          
          return (
            <div key={`restaurant-${restaurant.id}-${index}`}>
              <Card
                data={{
                  id: String(restaurant.id),
                  imageUrl: restaurant.image_url,
                  title: restaurant.name,
                  badge: toFixedRating(restaurant.google_rating),
                  subtitle: restaurant.price_range || '',
                  additionalText: displayText, // Use the utility function
                  showHeart: true,
                  isLiked: false,
                  kosherCategory: restaurant.kosher_category || restaurant.cuisine || '',
                  city: restaurant.address,
                  imageTag: restaurant.kosher_category || '',
                }}
                variant="default"
                onCardClick={() => handleCardClick(restaurant)}
              />
            </div>
          );
        })}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={() => {
              // Load more logic here
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
