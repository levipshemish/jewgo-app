'use client';

import { ArrowLeft, SlidersHorizontal, Heart, X, Star, MapPin, Search } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';

import { LocationPermissionPrompt } from '@/components/location';
import InteractiveRestaurantMap from '@/components/map/InteractiveRestaurantMap';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { fetchRestaurants, getMockRestaurants } from '@/lib/api/restaurants';
import { postToWorker, subscribe, type FilterWorkerMessage } from '@/lib/message-bus';
import { Restaurant } from '@/lib/types/restaurant';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';
import { throttle as throttleFn } from '@/lib/utils/touchUtils';
import { safeFilter } from '@/lib/utils/validation';

// Removed VirtualRestaurantList import since we're only showing map view

// Types
interface FilterState {
  agency?: string;
  dietary?: string;
  openNow?: boolean;
  category?: string;
  nearMe?: boolean;
  distanceRadius?: number;
  maxDistance?: number;
}

interface MapState {
  isLoadingMarkers: boolean;
  markerError: string | null;
  restaurantsWithCoords: Restaurant[];
  visibleCount?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Performance monitoring
interface PerformanceMetrics {
  loadTime: number;
  filterTime: number;
  renderTime: number;
  cacheHitRate: number;
}

export default function UnifiedLiveMapClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Core state
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [displayedRestaurants, setDisplayedRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  // Removed activeTab state since we're only showing map view
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPromptShown, setLocationPromptShown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showRestaurantCard, setShowRestaurantCard] = useState(false);

  // Performance and optimization state
  const [mapState, setMapState] = useState<MapState>({
    isLoadingMarkers: false,
    markerError: null,
    restaurantsWithCoords: []
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    filterTime: 0,
    renderTime: 0,
    cacheHitRate: 0
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('initializing');

  // Refs for performance optimization
  const lastFetchTime = useRef<number>(0);
  const fetchAbortController = useRef<AbortController | null>(null);
  const loadStartTime = useRef<number>(0);
  const performanceHistory = useRef<number[]>([]);
  const restaurantsRef = useRef<Restaurant[]>([]);
  const indexesRef = useRef<any>(null);

  // Constants
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Initialize component
  useEffect(() => {
    setMounted(true);
    loadStartTime.current = performance.now();
  }, []);

  // Handle URL parameters for deep linking
  useEffect(() => {
    const lat = searchParams?.get('lat');
    const lng = searchParams?.get('lng');
    const name = searchParams?.get('name');

    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (!isNaN(latitude) && !isNaN(longitude) &&
          latitude >= -90 && latitude <= 90 &&
          longitude >= -180 && longitude <= 180) {
        setMapCenter({ lat: latitude, lng: longitude });
        if (name) {
          const decodedName = decodeURIComponent(name);
          setSearchQuery(decodedName);
        }
      }
    }
  }, [searchParams]);

  // Check location permission on mount
  useEffect(() => {
    if (mounted) {
      const checkLocationPermission = async () => {
        if (!navigator.geolocation) {
          return;
        }

        const hasStoredLocation = localStorage.getItem('userLocation');
        const hasHandledPermission = localStorage.getItem('locationPermissionHandled');

        if (!userLocation && !hasStoredLocation && !hasHandledPermission && !locationPromptShown) {
          setShowLocationPrompt(true);
          setLocationPromptShown(true);
        }
      };

      checkLocationPermission();
    }
  }, [mounted, userLocation, locationPromptShown]);

  // Optimized data fetching with intelligent caching
  const fetchRestaurantsData = useCallback(async () => {
    const now = Date.now();
    
    // Check if we have recent data
    if (allRestaurants.length > 0 && (now - lastFetchTime.current) < CACHE_DURATION) {
      setLoadingProgress(100);
      setLoadingStage('complete');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setLoadingStage('checking-cache');
      setLoadingProgress(10);

      // Check cache first
      const cachedData = localStorage.getItem('restaurants_cache');
      const cacheTimestamp = localStorage.getItem('restaurants_cache_timestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
      
      if (cachedData && cacheAge < CACHE_DURATION) {
        setLoadingStage('loading-from-cache');
        setLoadingProgress(50);
        
        const restaurants = JSON.parse(cachedData);
        restaurantsRef.current = restaurants;
        setAllRestaurants(restaurants);
        setDisplayedRestaurants(restaurants);
        setPerformanceMetrics(prev => ({ ...prev, cacheHitRate: 1 }));
        setLoadingProgress(100);
        setLoadingStage('complete');
        return;
      }

      // Fetch fresh data
      setLoadingStage('fetching-data');
      setLoadingProgress(30);
      
      // Cancel any ongoing fetch
      if (fetchAbortController.current) {
        fetchAbortController.current.abort();
      }
      
      fetchAbortController.current = new AbortController();
      
      const data = await fetchRestaurants(1000);
      
      setLoadingStage('processing-data');
      setLoadingProgress(70);

      if (data && data.restaurants && Array.isArray(data.restaurants) && data.restaurants.length > 0) {
        const validRestaurants = data.restaurants.filter(restaurant =>
          restaurant && typeof restaurant === 'object' && restaurant.id
        );

        // Debug logging for restaurant data
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('LiveMap: Fetched restaurants:', {
            total: data.restaurants.length,
            valid: validRestaurants.length,
            withCoords: validRestaurants.filter(r => r.latitude && r.longitude).length,
            sample: validRestaurants[0] ? {
              id: validRestaurants[0].id,
              name: validRestaurants[0].name,
              lat: validRestaurants[0].latitude,
              lng: validRestaurants[0].longitude
            } : null
          });
        }

        restaurantsRef.current = validRestaurants;
        
        // Cache the data
        setLoadingStage('caching-data');
        setLoadingProgress(90);
        
        try {
          localStorage.setItem('restaurants_cache', JSON.stringify(validRestaurants));
          localStorage.setItem('restaurants_cache_timestamp', Date.now().toString());
        } catch (cacheError) {
          // Cache storage failed, continue anyway
        }

        startTransition(() => {
          setAllRestaurants(validRestaurants);
          setDisplayedRestaurants(validRestaurants);
        });
        
        setLoadingProgress(100);
        setLoadingStage('complete');
        
        // Update performance metrics
        const loadTime = performance.now() - loadStartTime.current;
        setPerformanceMetrics(prev => ({ 
          ...prev, 
          loadTime: Math.round(loadTime),
          cacheHitRate: 0
        }));
      } else {
        // Fallback to mock data
        setLoadingStage('loading-fallback');
        setLoadingProgress(80);
        
        const mockRestaurants = getMockRestaurants();
        restaurantsRef.current = mockRestaurants;
        setAllRestaurants(mockRestaurants);
        setDisplayedRestaurants(mockRestaurants);
        setError('Using fallback data - API temporarily unavailable');
        setLoadingProgress(100);
        setLoadingStage('complete');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      
      setLoadingStage('error');
      
      // Try to use stale cache as fallback
      const staleCache = localStorage.getItem('restaurants_cache');
      if (staleCache) {
        try {
          setLoadingStage('loading-stale-cache');
          setLoadingProgress(50);
          
          const restaurants = JSON.parse(staleCache);
          restaurantsRef.current = restaurants;
          setAllRestaurants(restaurants);
          setDisplayedRestaurants(restaurants);
          setError('Using cached data - API temporarily unavailable');
          setLoadingProgress(100);
          setLoadingStage('complete');
          return;
        } catch (parseError) {
          // Cache is corrupted
        }
      }
      
      const mockRestaurants = getMockRestaurants();
      restaurantsRef.current = mockRestaurants;
      setAllRestaurants(mockRestaurants);
      setDisplayedRestaurants(mockRestaurants);
      setError('Using fallback data - API temporarily unavailable');
      setLoadingProgress(100);
      setLoadingStage('error');
    } finally {
      setLoading(false);
      lastFetchTime.current = now;
    }
  }, [allRestaurants.length, startTransition]);

  // Fetch data when component mounts
  useEffect(() => {
    if (mounted) {
      fetchRestaurantsData();
    }
  }, [mounted, fetchRestaurantsData]);

  // Worker-based filtering system
  useEffect(() => {
    const unsubscribe = subscribe(({ type, payload }) => {
      if (type === 'FILTER_RESTAURANTS_RESULT') {
        startTransition(() => {
          const newRestaurants = payload.restaurants || [];
          setDisplayedRestaurants(newRestaurants);
        });
      }
    });
    return () => { unsubscribe(); };
  }, []);

  // Throttled worker posts
  const throttledPost = useMemo(() => throttleFn((message: FilterWorkerMessage) => {
    postToWorker(message);
  }, 120), []);

  // Apply filters via worker
  useEffect(() => {
    const message: FilterWorkerMessage = {
      type: 'FILTER_RESTAURANTS',
      payload: {
        restaurants: allRestaurants,
        searchQuery,
        activeFilters,
        userLocation,
      },
    };
    throttledPost(message);
  }, [allRestaurants, searchQuery, activeFilters, userLocation, throttledPost]);

  // Location handlers
  const handleLocationGranted = (location: { latitude: number; longitude: number }) => {
    setUserLocation(location);
    setShowLocationPrompt(false);
    setLocationLoading(false);

    localStorage.setItem('userLocation', JSON.stringify(location));
    localStorage.setItem('locationPermissionHandled', 'granted');
  };

  const handleLocationDenied = () => {
    setShowLocationPrompt(false);
    setLocationError('Location access denied');
    setLocationLoading(false);
    localStorage.setItem('locationPermissionHandled', 'denied');
  };

  const handleLocationPromptDismiss = () => {
    setShowLocationPrompt(false);
    setLocationLoading(false);
    localStorage.setItem('locationPermissionHandled', 'dismissed');
  };

  const handleLocationRequest = () => {
    setLocationLoading(true);
    setLocationError(null);
  };

  // Event handlers
  const handleRestaurantSelect = useCallback((restaurantId: number) => {
    const restaurant = allRestaurants.find(r => r.id === restaurantId);
    setSelectedRestaurant(restaurant || null);
    setShowRestaurantCard(true);
  }, [allRestaurants]);

  const handleCloseRestaurantCard = useCallback(() => {
    setShowRestaurantCard(false);
    setSelectedRestaurant(null);
  }, []);

  const handleFilterChange = useCallback((filterType: 'agency' | 'dietary' | 'category', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const handleToggleFilter = useCallback((filterType: 'openNow' | 'nearMe', value: boolean) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setActiveFilters({});
  }, []);

  const handleShowFilters = useCallback(() => {
    setShowFilters(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  // Removed handleTabChange since we're only showing map view

  // Utility functions
  const formatPriceRange = useCallback((restaurant: Restaurant) => {
    if (restaurant.price_range && restaurant.price_range.trim() !== '') {
      if (restaurant.price_range.includes('-')) {
        return `$${restaurant.price_range}`;
      }
      return restaurant.price_range;
    }

    if ((restaurant as any).min_avg_meal_cost && (restaurant as any).max_avg_meal_cost) {
      return `$${(restaurant as any).min_avg_meal_cost}-${(restaurant as any).max_avg_meal_cost}`;
    }

    return '$15-25';
  }, []);

  const getRating = useCallback((restaurant: Restaurant) => {
    const rating = restaurant.rating || (restaurant as any).star_rating || (restaurant as any).google_rating;
    return rating && rating > 0 ? rating : 4.5;
  }, []);

  const getReviewCount = useCallback((restaurant: Restaurant) => {
    return (restaurant as any).review_count || (restaurant as any).google_review_count || 25;
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Boolean(searchQuery.trim()) ||
           Object.values(activeFilters).some(value =>
             value !== undefined && value !== false && value !== ''
           );
  }, [searchQuery, activeFilters]);

  // Loading states
  if (loading && loadingStage === 'initializing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div 
              className="absolute inset-0 rounded-full border-4 border-blue-600 transition-all duration-500 ease-out"
              style={{
                clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                transform: `rotate(${loadingProgress * 3.6}deg)`
              }}
            ></div>
            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Finding Great Restaurants</h3>
          <p className="text-sm text-gray-600 mb-4">We&apos;re searching for the best kosher eateries...</p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{Math.round(loadingProgress)}% complete</p>
        </div>
      </div>
    );
  }

  if (error && !allRestaurants.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Unable to Load Restaurants</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchRestaurantsData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={handleShowFilters}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Removed Tab Navigation - only showing map view */}

      {/* Main Content - Map Only */}
      <div className="pt-16 pb-20">
        <div className="h-[calc(100vh-4rem)]">
          <InteractiveRestaurantMap
            restaurants={displayedRestaurants}
            userLocation={userLocation}
            selectedRestaurantId={selectedRestaurant?.id}
            onRestaurantSelect={handleRestaurantSelect}
            mapCenter={mapCenter}
            className="h-full rounded-none shadow-none bg-transparent"
            showRatingBubbles={true}
            onUserLocationUpdate={setUserLocation}
            onMapStateUpdate={setMapState}
          />
        </div>
      </div>

      {/* Restaurant Detail Card */}
      {showRestaurantCard && selectedRestaurant && (
        <div
          className="fixed bottom-20 left-4 right-4 sm:left-8 sm:right-8 max-w-sm mx-auto bg-white rounded-2xl shadow-2xl z-50 max-h-[40vh] overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => router.push(`/restaurant/${selectedRestaurant.id}`)}
        >
          <div className="relative">
            <div className="relative h-32 bg-gray-200">
              {(() => {
                const safeImageUrl = getSafeImageUrl(selectedRestaurant.image_url);
                return safeImageUrl !== '/images/default-restaurant.webp' ? (
                  <img
                    src={safeImageUrl}
                    alt={selectedRestaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-400 text-sm">No Image</span>
                  </div>
                );
              })()}

              <div className="absolute top-2 right-2 flex space-x-1">
                <button
                  className="w-8 h-7 bg-transparent border-0 p-0 m-0 rounded-none transition-all duration-200 hover:scale-105 z-10 flex items-center justify-center active:scale-95 group"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Add to favorites"
                  title="Add to favorites"
                >
                  <Heart
                    className="w-5 h-5 transition-all duration-150 ease-out stroke-white stroke-2 fill-gray-300 text-gray-300 drop-shadow-sm group-hover:fill-pink-500 group-hover:text-pink-500"
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseRestaurantCard();
                  }}
                  className="p-1.5 bg-transparent border border-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white/20 transition-colors flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-2">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <h2 className="text-base font-semibold text-gray-900 mb-1">
                  {selectedRestaurant.name}
                </h2>

                <div className="flex items-center space-x-1 mb-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium text-gray-900">
                    {getRating(selectedRestaurant).toFixed(2)} ({getReviewCount(selectedRestaurant)})
                  </span>
                </div>

                <p className="text-xs text-gray-600 mb-1">
                  {selectedRestaurant.kosher_category && (
                    <span className="capitalize">{selectedRestaurant.kosher_category} cuisine</span>
                  )}
                  {selectedRestaurant.certifying_agency && (
                    <span> • {selectedRestaurant.certifying_agency} certified</span>
                  )}
                </p>

                {selectedRestaurant.address && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedRestaurant.address}</span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-500 block">Price Range</span>
                <p className="text-sm font-semibold text-gray-900">
                  {formatPriceRange(selectedRestaurant)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Status */}
      <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          {mapState.markerError ? (
            <div className="text-xs">
              <div className="text-red-600 mb-1">{mapState.markerError}</div>
              <button
                onClick={() => {}}
                className="text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="text-xs font-medium text-gray-700">
              {mapState.isLoadingMarkers ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Loading markers...</span>
                </div>
              ) : (
                <span>
                  {mapState.restaurantsWithCoords.length > 0
                    ? `${mapState.visibleCount ?? mapState.restaurantsWithCoords.length} in view`
                    : 'No restaurants nearby'}
                </span>
              )}
              {userLocation && (
                <span className="text-blue-600 ml-2">📍 Your location</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-40 bg-black/80 text-white text-xs p-2 rounded">
          <div>Load: {performanceMetrics.loadTime}ms</div>
          <div>Filter: {performanceMetrics.filterTime}ms</div>
          <div>Cache: {Math.round(performanceMetrics.cacheHitRate * 100)}%</div>
          <div>Restaurants: {allRestaurants.length}</div>
          <div>Displayed: {displayedRestaurants.length}</div>
          <button 
            onClick={() => {
              const mockData = getMockRestaurants();
              setAllRestaurants(mockData);
              setDisplayedRestaurants(mockData);
              setError('Using test mock data');
            }}
            className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Load Test Data
          </button>
        </div>
      )}

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button
                  onClick={handleCloseFilters}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <AdvancedFilters
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onToggleFilter={handleToggleFilter}
                onDistanceChange={(distance: number) => {
                  setActiveFilters(prev => ({ ...prev, maxDistance: distance }));
                }}
                onClearAll={handleClearAll}
                userLocation={userLocation}
                locationLoading={locationLoading}
              />
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleCloseFilters}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Permission Prompt */}
      {showLocationPrompt && (
        <LocationPermissionPrompt
          onLocationGranted={handleLocationGranted}
          onLocationDenied={handleLocationDenied}
          onDismiss={handleLocationPromptDismiss}
          onLocationRequest={handleLocationRequest}
        />
      )}
    </div>
  );
}
