'use client';

import { ArrowLeft, SlidersHorizontal, X, Search, Heart, Star } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';

import { InteractiveRestaurantMap } from '@/components/map/InteractiveRestaurantMap';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { fetchRestaurants } from '@/lib/api/restaurants';
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
  const [mapState, setMapState] = useState<MapState>({
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
      
      const data = await fetchRestaurants({ limit: 1000, signal: fetchAbortController.current.signal });
      
      setLoadingStage('processing-data');
      setLoadingProgress(70);

      if (data && data.restaurants && Array.isArray(data.restaurants) && data.restaurants.length > 0) {
        const validRestaurants = data.restaurants.filter(restaurant =>
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
    const restaurant = allRestaurants.find(r => parseInt(r.id.toString()) === restaurantId);
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
  const transformRestaurantToCardData = useCallback((restaurant: Restaurant) => {
    const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating || restaurant.quality_rating;
    const ratingText = rating ? rating.toFixed(1) : undefined;
    
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
    
    const priceRange = restaurant.price_range && restaurant.price_range.trim() !== '' ? restaurant.price_range : '';
    
    // Format address info for display
    const addressParts = [restaurant.address, restaurant.city, restaurant.state].filter(Boolean);
    const fullAddress = addressParts.join(', ');
    
    return {
      id: restaurant.id.toString(),
      imageUrl: restaurant.image_url,
      imageTag: restaurant.kosher_category,
      title: restaurant.name,
      badge: ratingText,
      subtitle: priceRange || 'Price Range',
      additionalText: distanceText,
      showHeart: true,
      isLiked: false, // Will be set by the component based on favorites state
      kosherCategory: restaurant.kosher_category,
      city: fullAddress || restaurant.city,
      address: restaurant.address,
      certifyingAgency: restaurant.certifying_agency,
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
    <div className="h-screen bg-white relative overflow-hidden">
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
            <div 
              className="w-full bg-white shadow-2xl hover:shadow-3xl transition-shadow rounded-2xl aspect-[3/2] max-w-sm h-56 border border-gray-200 overflow-hidden cursor-pointer"
              onClick={(e) => {
                // Stop propagation to prevent closing the card
                e.stopPropagation();
                
                // Use restaurant ID for routing (matches eatery/[id] structure)
                router.push(`/eatery/${selectedRestaurant.id}`)
              }}
            >
              {/* Image Section - Taller for better visibility */}
              <div className="relative w-full h-32 overflow-hidden">
                {selectedRestaurant.image_url ? (
                  <img
                    src={selectedRestaurant.image_url}
                    alt={selectedRestaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <div className="text-gray-400 text-xs">No image</div>
                  </div>
                )}
                
                {/* Kosher Category Badge (Tag) - matches current eatery page exactly */}
                {selectedRestaurant.kosher_category && (
                  <div 
                    className="absolute rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '80px',
                      maxWidth: '80px',
                      minWidth: '80px',
                      height: '24px',
                      maxHeight: '24px',
                      minHeight: '24px',
                      overflow: 'hidden',
                      padding: '0 8px',
                      fontSize: '12px',
                      lineHeight: '1',
                      fontWeight: '500',
                      backgroundColor: 'rgba(17, 24, 39, 0.70)',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      contain: 'layout paint',
                      transition: 'all 0.2s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(17, 24, 39, 0.85)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(17, 24, 39, 0.70)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                    }}
                  >
                    {selectedRestaurant.kosher_category.charAt(0).toUpperCase() + selectedRestaurant.kosher_category.slice(1).toLowerCase()}
                  </div>
                )}
                
                {/* Heart Button - matches current eatery page exactly */}
                <button
                  className="absolute rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '8px',
                    width: '28px',
                    maxWidth: '28px',
                    minWidth: '28px',
                    height: '28px',
                    maxHeight: '28px',
                    minHeight: '28px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    border: 'none',
                    padding: '0',
                    zIndex: 10,
                    transition: 'all 0.2s ease-out',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(selectedRestaurant);
                  }}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    style={{
                      width: '18px',
                      height: '18px',
                      color: 'rgb(156, 163, 175)', // light grey for default state
                      fill: 'rgb(156, 163, 175)', // light grey fill for default state
                      stroke: '#ffffff', // white outline
                      strokeWidth: '1.5px',
                      transition: 'all 0.2s ease-out',
                      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgb(239, 68, 68)';
                      e.currentTarget.style.fill = 'rgb(239, 68, 68)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgb(156, 163, 175)';
                      e.currentTarget.style.fill = 'rgb(156, 163, 175)';
                    }}
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
                
              </div>
              
              {/* Content Section - matches eatery page exactly */}
              <div className="p-3 flex-1">
                {/* Restaurant Name and Rating - Fixed height container with proper alignment */}
                <div className="flex items-center justify-between w-full min-w-0 flex-shrink-0 h-8 mb-1 gap-2">
                  <h3 
                    className="font-bold text-gray-900 leading-tight flex-1 min-w-0 text-left text-base" 
                    title={selectedRestaurant.name}
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }}
                  >
                    {selectedRestaurant.name}
                  </h3>
                  
                  {/* Rating - on same line as name */}
                  {(() => {
                    const rating = selectedRestaurant.rating || selectedRestaurant.star_rating || selectedRestaurant.google_rating || selectedRestaurant.quality_rating;
                    return rating ? (
                      <div className="flex items-center gap-1 flex-shrink-0" style={{ minWidth: 'fit-content' }}>
                        <Star className="fill-yellow-400 text-yellow-400 flex-shrink-0 w-3.5 h-3.5" />
                        <span className="font-semibold text-gray-800 whitespace-nowrap flex-shrink-0 text-sm">
                          {rating.toFixed(1)}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
                
                {/* Price Range and Distance - Fixed height meta row with consistent alignment */}
                <div className="flex items-center justify-between min-w-0 w-full flex-shrink-0 h-6 gap-2">
                  <span className="text-gray-700 font-medium flex-shrink-0 text-sm">
                    {selectedRestaurant.price_range || '$$'}
                  </span>
                  
                  {(() => {
                    // Calculate distance if not already available
                    let distanceText = selectedRestaurant.distance;
                    if (!distanceText && userLocation && selectedRestaurant.latitude && selectedRestaurant.longitude) {
                      const distance = calculateDistance(
                        userLocation.latitude, 
                        userLocation.longitude, 
                        selectedRestaurant.latitude, 
                        selectedRestaurant.longitude
                      );
                      distanceText = `${distance.toFixed(1)} mi`;
                    }
                    
                    return distanceText ? (
                      <span className="text-gray-500 text-sm flex-1 text-right">
                        {distanceText}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}

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
                (error) => {
                  console.error('Error getting location:', error);
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
