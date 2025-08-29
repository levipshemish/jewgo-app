'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { ModernFilterPopup } from '@/frontend/components/filters/ModernFilterPopup';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { AppliedFilters } from '@/lib/filters/filters.types';

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Utility function to format distance for display
const formatDistance = (distance: number) => {
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)}ft`; // Convert to feet
  } else if (distance < 1) {
    return `${distance.toFixed(1)}mi`; // Show as 0.2mi, 0.5mi, etc.
  } else {
    return `${distance.toFixed(1)}mi`; // Show as 1.2mi, 2.5mi, etc.
  }
};

interface Restaurant {
  id: string | number;
  name: string;
  address: string;
  phone?: string;
  phone_number?: string;
  website: string;
  cuisine?: string;
  kosher_category?: string;
  rating?: number | string;
  google_rating?: number | string;
  price_range: string;
  image_url: string;
  is_open: boolean;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

interface ApiResponse {
  success: boolean;
  data: Restaurant[];
  total: number;
  error: string | null;
}

export function EateryPageClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters hook
  const {
    activeFilters,
    hasActiveFilters,
    setFilter,
    clearAllFilters,
    getFilterCount
  } = useAdvancedFilters();
  
  // Location state from context
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    error: locationError,
    requestLocation,
    checkPermissionStatus,
    refreshPermissionStatus,
  } = useLocation();

  // Location prompt popup state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hasShownLocationPrompt, setHasShownLocationPrompt] = useState(false);


  const fetchRestaurants = useCallback(async (page: number = 1, query: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      // Construct URL more explicitly to avoid encoding issues
      const baseUrl = '/api/restaurants-with-images';
      const queryParams: string[] = [];
      queryParams.push(`page=${encodeURIComponent(page.toString())}`);
      queryParams.push(`limit=100`); // Higher limit to show more restaurants
      
      if (query && query.trim()) {
        queryParams.push(`search=${encodeURIComponent(query.trim())}`);
      }
      
      const url = `${baseUrl}?${queryParams.join('&')}`;
      const response = await fetch(url);
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setRestaurants(data.data);
        setTotalPages(Math.ceil(data.total / 100));
      } else {
        setError(data.error || 'Failed to fetch restaurants');
      }
    } catch (err) {
      setError('Failed to fetch restaurants');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  }, []);



  useEffect(() => {
    fetchRestaurants(currentPage, searchQuery);
  }, [currentPage, searchQuery, fetchRestaurants]);

  // Show location prompt when page loads and user doesn't have location
  useEffect(() => {
    const checkAndShowLocationPrompt = async () => {
      // Only show prompt if we haven't shown it before and user doesn't have location
      if (!hasShownLocationPrompt && !userLocation && !locationLoading) {
        // Refresh permission status to ensure we have the latest state
        await refreshPermissionStatus();
        
        // Check the actual browser permission status
        const actualPermissionStatus = await checkPermissionStatus();
        
        // Only show prompt if permission is not denied and not granted
        if (actualPermissionStatus === 'prompt') {
          setShowLocationPrompt(true);
          setHasShownLocationPrompt(true);
        }
      }
    };

    checkAndShowLocationPrompt();
  }, [hasShownLocationPrompt, userLocation, locationLoading, checkPermissionStatus, refreshPermissionStatus]);

  // Close location prompt when user gets location
  useEffect(() => {
    if (showLocationPrompt && userLocation) {
      setShowLocationPrompt(false);
    }
  }, [showLocationPrompt, userLocation]);

  // Force re-render when permission status changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📍 EateryPage: Permission status changed to:', permissionStatus);
    }
    
    // If permission is granted but we don't have location, request it
    if (permissionStatus === 'granted' && !userLocation && !locationLoading) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📍 EateryPage: Permission granted but no location, requesting location');
      }
      requestLocation();
    }
  }, [permissionStatus, userLocation, locationLoading, requestLocation]);

  // Calculate distances and sort restaurants when location is available
  const restaurantsWithDistance = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📍 EateryPage: Recalculating restaurant sorting', {
        hasUserLocation: !!userLocation,
        permissionStatus,
        restaurantCount: restaurants.length
      });
    }

    // If no location or permission not granted, return original order
    if (!userLocation || permissionStatus !== 'granted') {
      if (process.env.NODE_ENV === 'development') {
        console.log('📍 EateryPage: No location available, returning original order');
      }
      return restaurants.map(restaurant => ({
        ...restaurant,
        distance: undefined
      }));
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📍 EateryPage: Calculating distances and sorting by distance');
    }

    return restaurants.map(restaurant => {
      let distance: number | undefined;
      
      // Calculate distance if restaurant has coordinates
      if (restaurant.latitude && restaurant.longitude) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          restaurant.latitude,
          restaurant.longitude
        );
      }
      
      return {
        ...restaurant,
        distance
      };
    }).sort((a, b) => {
      // Sort by distance if both have distances
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      // Put restaurants with distances first
      if (a.distance !== undefined && b.distance === undefined) {
        return -1;
      }
      if (a.distance === undefined && b.distance !== undefined) {
        return 1;
      }
      // Keep original order for restaurants without coordinates
      return 0;
    });
  }, [restaurants, userLocation, permissionStatus]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, []);

  const handleShowFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  const handleApplyFilters = useCallback((filters: AppliedFilters) => {
    // Apply the filters to the active filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        setFilter(key as keyof typeof activeFilters, value);
      }
    });
    setShowFilters(false);
  }, [setFilter, activeFilters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 eatery-page">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="eatery" />
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
          <button
            onClick={() => fetchRestaurants(currentPage, searchQuery)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] pb-20 eatery-page">
      <div className="sticky top-0 z-50 bg-white">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="eatery" />
        </div>
        
        <ActionButtons 
          onShowFilters={handleShowFilters}
          onShowMap={() => router.push('/live-map')}
          onAddEatery={() => router.push('/add-eatery')}
        />
      </div>
      
      {/* Location Permission Banner */}
      {permissionStatus === 'prompt' && !locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-blue-800">
                Enable location to see distance from you
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshPermissionStatus}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-blue-100"
                title="Refresh permission status"
              >
                Refresh
              </button>
              <button
                onClick={requestLocation}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium px-3 py-1 rounded-lg hover:bg-blue-100"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Location Loading Indicator */}
      {locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">Getting your location...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Location Error Banner */}
      {locationError && permissionStatus !== 'granted' && !locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-red-50 border-b border-red-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-800">{locationError}</span>
            </div>
          </div>
        </div>
      )}

      {/* Location-Based Sorting Indicator */}
      {permissionStatus === 'granted' && userLocation && (
        <div className="px-4 sm:px-6 py-2 bg-green-50 border-b border-green-100">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-green-800 font-medium">
                Restaurants sorted by distance from you
              </span>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🍽️</div>
          <p className="text-lg text-gray-600 mb-2">No restaurants found</p>
          <p className="text-sm text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search or filters'
              : 'Be the first to add a restaurant!'
            }
          </p>
        </div>
      ) : (
        <div 
          className="restaurant-grid"
          role="grid"
          aria-label="Restaurant listings"
          style={{ 
            contain: 'layout style paint',
            willChange: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {restaurantsWithDistance.map((restaurant, index) => (
            <div 
              key={restaurant.id} 
              className="w-full" 
              role="gridcell"
              style={{
                contain: 'layout style paint',
                willChange: 'auto',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <UnifiedCard
                data={{
                  id: String(restaurant.id),
                  imageUrl: restaurant.image_url,
                  title: restaurant.name,
                  badge: typeof restaurant.google_rating === 'number' ? restaurant.google_rating.toFixed(1) : String(restaurant.google_rating || ''),
                  subtitle: restaurant.price_range || '',
                  additionalText: restaurant.distance ? formatDistance(restaurant.distance) : '',
                  showHeart: true,
                  isLiked: false,
                  kosherCategory: restaurant.kosher_category || restaurant.cuisine || '',
                  city: restaurant.address,
                  imageTag: restaurant.kosher_category || ''
                }}
                showStarInBadge={true}
                onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
                priority={index < 4}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="mt-8 mb-24" role="navigation" aria-label="Pagination">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={loading}
            className="mb-4"
          />
          <div className="text-center text-sm text-gray-600">
            Showing {restaurantsWithDistance.length} of {restaurantsWithDistance.length * totalPages} restaurants
          </div>
        </div>
      )}

      {/* Bottom navigation - visible on all screen sizes */}
      <BottomNavigation />

      {/* Filter Modal */}
      {/* Modern Filter Modal */}
      <ModernFilterPopup
        isOpen={showFilters}
        onClose={handleCloseFilters}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        userLocation={userLocation}
        locationLoading={locationLoading}
        onRequestLocation={requestLocation}
      />

      {/* Location Prompt Popup */}
      <LocationPromptPopup
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onSkip={() => {
          setShowLocationPrompt(false);
        }}
      />
    </div>
  );
}
