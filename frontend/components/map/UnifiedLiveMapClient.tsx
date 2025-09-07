'use client';

import { ArrowLeft, SlidersHorizontal, X, Search, Star } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';

import { InteractiveRestaurantMap } from '@/components/map/InteractiveRestaurantMap';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import Card from '@/components/core/cards/Card';
// Remove old fetchRestaurants import - we'll use unified API directly
import { postToWorker, subscribe, type FilterWorkerMessage } from '@/lib/message-bus';
import { Restaurant } from '@/lib/types/restaurant';
import { throttle as throttleFn } from '@/lib/utils/touchUtils';
import { useLocation } from '@/lib/contexts/LocationContext';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { favoritesManager } from '@/lib/utils/favorites';

// Removed VirtualRestaurantList import since we're only showing map view

// Types

interface MapState {
  isLoadingMarkers: boolean;
  markerError: string | null;
  restaurantsWithCoords: Restaurant[];
  visibleCount: number | null;
}

// interface UserLocation {
//   latitude: number;
//   longitude: number;
//   accuracy?: number;
// }

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
  const [, startTransition] = useTransition();

  // Core state
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [displayedRestaurants, setDisplayedRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  // Location state from context
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    requestLocation,
    setLocation
  } = useLocation();
  
  // Use the shared advanced filters hook
  const {
    activeFilters,
    setFilter,
    clearAllFilters
  } = useAdvancedFilters();
  
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  // Removed activeTab state since we're only showing map view
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPromptShown, setLocationPromptShown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showRestaurantCard, setShowRestaurantCard] = useState(false);

  // Performance and optimization state
  const [_mapState, setMapState] = useState<MapState>({
    isLoadingMarkers: false,
    markerError: null,
    restaurantsWithCoords: [],
    visibleCount: null,
  });
  const [_performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
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
  // const performanceHistory = useRef<number[]>([]);
  const restaurantsRef = useRef<Restaurant[]>([]);
  // const indexesRef = useRef<any>(null);

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

        // Use the same key as LocationContext
        const locationData = localStorage.getItem('jewgo_location_data');
        const hasHandledPermission = localStorage.getItem('locationPermissionHandled');

        // Only show location prompt if:
        // 1. No user location available
        // 2. No stored location data
        // 3. Permission hasn't been handled
        // 4. Prompt hasn't been shown in this session
        // 5. Permission status is 'prompt' (not denied or granted)
        // 6. Haven't shown prompt recently (within last 24 hours)
        const lastPromptTime = localStorage.getItem('locationPromptLastShown');
        const timeSinceLastPrompt = lastPromptTime ? Date.now() - parseInt(lastPromptTime) : Infinity;
        const minTimeBetweenPrompts = 24 * 60 * 60 * 1000; // 24 hours
        
        if (!userLocation && 
            !locationData && 
            !hasHandledPermission && 
            !locationPromptShown && 
            permissionStatus === 'prompt' &&
            timeSinceLastPrompt > minTimeBetweenPrompts) {
          setShowLocationPrompt(true);
          setLocationPromptShown(true);
          localStorage.setItem('locationPromptLastShown', Date.now().toString());
        }
      };

      checkLocationPermission();
    }
  }, [mounted, userLocation, locationPromptShown, permissionStatus]);

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
      
      // Use unified API endpoint like the eatery page
      const apiUrl = new URL('/api/restaurants/unified', window.location.origin);
      apiUrl.searchParams.set('limit', '1000');
      apiUrl.searchParams.set('offset', '0');
      
      // Add location if available
      if (userLocation) {
        apiUrl.searchParams.set('lat', userLocation.latitude.toString());
        apiUrl.searchParams.set('lng', userLocation.longitude.toString());
      }
      
      const response = await fetch(apiUrl.toString(), {
        cache: "no-store",
        headers: {
          'Content-Type': 'application/json',
        },
        signal: fetchAbortController.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Backend error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setLoadingStage('processing-data');
      setLoadingProgress(70);

      if (data && data.data && data.data.restaurants && Array.isArray(data.data.restaurants) && data.data.restaurants.length > 0) {
        const validRestaurants = data.data.restaurants.filter((restaurant: any) =>
          restaurant && typeof restaurant === 'object' && restaurant.id
        );



        restaurantsRef.current = validRestaurants;
        
        // Cache the data
        setLoadingStage('caching-data');
        setLoadingProgress(90);
        
        try {
          localStorage.setItem('restaurants_cache', JSON.stringify(validRestaurants));
          localStorage.setItem('restaurants_cache_timestamp', Date.now().toString());
        } catch (_cacheError) {
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
        // Handle API error
        setLoadingStage('loading-error');
        setLoadingProgress(100);
        setError('Unable to connect to restaurant service. Please try again later.');
        restaurantsRef.current = [];
        setAllRestaurants([]);
        setDisplayedRestaurants([]);
        setLoadingStage('complete');
      }
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
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
        } catch (_parseError) {
          // Cache is corrupted
        }
      }
      
      setError('Failed to load restaurants. Please check your connection and try again.');
      restaurantsRef.current = [];
      setAllRestaurants([]);
      setDisplayedRestaurants([]);
      setLoadingProgress(100);
      setLoadingStage('error');
    } finally {
      setLoading(false);
      lastFetchTime.current = now;
    }
  }, [allRestaurants.length, startTransition, CACHE_DURATION]);

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
  const throttledPost = useMemo(() => throttleFn((message: any) => {
    postToWorker(message);
  }, 120), []);

  // Apply filters via worker
  useEffect(() => {
    // Don't process if there are no restaurants to filter
    if (allRestaurants.length === 0) {
      return;
    }
    
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

  const handleToggleFavorite = useCallback((restaurant: Restaurant) => {
    const restaurantId = restaurant.id.toString();
    const isCurrentlyFavorite = favoritesManager.isFavorite(restaurantId);
    
    if (isCurrentlyFavorite) {
      favoritesManager.removeFavorite(restaurantId);
    } else {
      favoritesManager.addFavorite(restaurant);
    }
    
    // Force re-render by updating the selected restaurant
    setSelectedRestaurant({ ...restaurant });
  }, []);

  // Calculate distance between two points in miles
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Transform restaurant data to match Card component's CardData interface
  const _transformRestaurantToCardData = useCallback((restaurant: Restaurant) => {
    // Handle rating data - all rating fields are currently null in backend
    const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating || restaurant.quality_rating;
    const ratingText = rating && typeof rating === 'number' && !isNaN(rating) ? rating.toFixed(1) : undefined;
    
    // Calculate distance if user location is available and restaurant has coordinates
    let distanceText = restaurant.distance && restaurant.distance.trim() !== '' ? restaurant.distance : '';
    if (!distanceText && userLocation && restaurant.latitude && restaurant.longitude) {
      const distance = calculateDistance(
        userLocation.latitude, 
        userLocation.longitude, 
        restaurant.latitude, 
        restaurant.longitude
      );
      distanceText = `${distance.toFixed(1)} mi`;
    }
    
    // Try multiple price fields in order of preference
    // Most price fields are currently null in backend, so we rely on price_range
    const priceRange = restaurant.price_range && restaurant.price_range.trim() !== '' 
      ? restaurant.price_range 
      : restaurant.avg_price && restaurant.avg_price.trim() !== ''
      ? restaurant.avg_price
      : restaurant.min_avg_meal_cost && restaurant.max_avg_meal_cost
      ? `$${restaurant.min_avg_meal_cost}-${restaurant.max_avg_meal_cost}`
      : restaurant.min_avg_meal_cost
      ? `$${restaurant.min_avg_meal_cost}+`
      : '$$'; // Default fallback since most restaurants have price_range
    
    // Debug logging for price range - show all possible price fields
    if (process.env.NODE_ENV === 'development') {
      console.log('Restaurant price data for', restaurant.name, ':', {
        price_range: restaurant.price_range,
        avg_price: restaurant.avg_price,
        min_avg_meal_cost: restaurant.min_avg_meal_cost,
        max_avg_meal_cost: restaurant.max_avg_meal_cost,
        processed_priceRange: priceRange,
        allRestaurantKeys: Object.keys(restaurant).filter(key => key.toLowerCase().includes('price') || key.toLowerCase().includes('cost')),
        // Show first few keys to understand the data structure
        sampleKeys: Object.keys(restaurant).slice(0, 10)
      });
    }
    
    // Format address info for display - handle null/undefined values
    const addressParts = [
      restaurant.address, 
      restaurant.city, 
      restaurant.state
    ].filter(part => part && typeof part === 'string' && part.trim() !== '');
    const fullAddress = addressParts.join(', ');
    
    return {
      id: restaurant.id.toString(),
      imageUrl: restaurant.image_url || '/images/default-restaurant.webp', // Fallback for missing images
      imageTag: restaurant.kosher_category || 'Unknown',
      title: restaurant.name || 'Unknown Restaurant',
      badge: ratingText,
      subtitle: priceRange, // Now has proper fallback to '$$'
      additionalText: distanceText,
      showHeart: true,
      isLiked: false, // Will be set by the component based on favorites state
      kosherCategory: restaurant.kosher_category || 'Unknown',
      city: fullAddress || restaurant.city || 'Unknown Location',
      address: restaurant.address || '',
      certifyingAgency: restaurant.certifying_agency || 'Unknown',
      distance: distanceText, // Add distance to the returned object
    };
  }, [userLocation, calculateDistance]);

  const handleFilterChange = useCallback((filterType: keyof typeof activeFilters, value: any) => {
    setFilter(filterType, value);
  }, [setFilter]);

  const handleToggleFilter = useCallback((filterType: keyof typeof activeFilters) => {
    const currentValue = activeFilters[filterType];
    if (currentValue) {
      setFilter(filterType, undefined);
    } else {
      setFilter(filterType, true as any);
    }
  }, [activeFilters, setFilter]);

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    clearAllFilters();
  }, [clearAllFilters]);

  const handleShowFilters = useCallback(() => {
    setShowFilters(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  // Removed handleTabChange since we're only showing map view

  // Utility functions


  // const hasActiveFilters = useMemo(() => {
  //   return Boolean(searchQuery.trim()) ||
  //          Object.values(activeFilters).some(value =>
  //            value !== undefined && value !== false && value !== ''
  //          );
  // }, [searchQuery, activeFilters]);

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
    <div className="h-screen bg-white relative">
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
      <div className="h-full">
        <div 
          className="h-full"
          onClick={() => {
            // Close card when clicking on map (outside of card)
            if (showRestaurantCard) {
              handleCloseRestaurantCard();
            }
          }}
        >
          <InteractiveRestaurantMap
            restaurants={displayedRestaurants}
            userLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null}
            selectedRestaurantId={selectedRestaurant?.id || null}
            onRestaurantSelect={(restaurant) => handleRestaurantSelect(parseInt(restaurant.id.toString()))}
            mapCenter={mapCenter || undefined}
            className="h-full rounded-none shadow-none bg-transparent"
            showRatingBubbles={true}
            onMapStateUpdate={(state) => setMapState(state)}
          />
        </div>
      </div>

      {/* Restaurant Detail Card */}
      {showRestaurantCard && selectedRestaurant && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-8 sm:right-8 max-w-sm mx-auto z-50">
          <div className="relative">
            <Card
              data={_transformRestaurantToCardData(selectedRestaurant)}
              onCardClick={() => {
                // Use restaurant ID for routing (matches eatery/[id] structure)
                router.push(`/eatery/${selectedRestaurant.id}`)
              }}
              onLikeToggle={(_id, _isLiked) => handleToggleFavorite(selectedRestaurant)}
              variant="map"
              showStarInBadge={true}
              className=""
            />
            
            {/* Close Button - Overlay on top-right */}
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseRestaurantCard();
                }}
                className="w-8 h-8 border border-white/60 rounded-full transition-all duration-200 hover:scale-105 flex items-center justify-center active:scale-95 backdrop-blur-md shadow-lg hover:border-white/80 hover:backdrop-blur-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                }}
              >
                <X className="w-4 h-4 text-white drop-shadow-sm hover:text-gray-200 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Location Button */}
      {/* My Location Button */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => {
            if (userLocation) {
              // Center map on user location with 5-mile zoom
              setMapCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
              // Set zoom level for approximately 5-mile radius (zoom level 12-13)
              // This will be handled by the InteractiveRestaurantMap component
            } else {
              // Request location permission
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const newLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: Date.now()
                  };
                  // Update location context and center map
                  setLocation(newLocation);
                  setMapCenter({ lat: newLocation.latitude, lng: newLocation.longitude });
                },
                (err) => {
                  console.error('Error getting location:', err);
                }
              );
            }
          }}
          className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg hover:bg-white transition-colors pointer-events-auto"
          title={userLocation ? "Center on my location" : "Get my location"}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">📍</span>
            <span className="text-xs font-medium text-gray-700">
              {userLocation ? "My Location" : "Find Me"}
            </span>
          </div>
        </button>
      </div>

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
      {showLocationPrompt && permissionStatus === 'prompt' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enable Location Services</h3>
              <p className="text-gray-600 mb-6">
                Allow location access to see restaurants near you and get distance information.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    requestLocation();
                    setShowLocationPrompt(false);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Enable
                </button>
                <button
                  onClick={() => setShowLocationPrompt(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
