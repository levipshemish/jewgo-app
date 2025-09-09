"use client"
import { useState, useEffect, useCallback, useRef, RefObject, useMemo } from "react"
import Card from "@/components/core/cards/Card"
import { Loader2, Search, WifiOff, AlertTriangle, RefreshCw } from "lucide-react"
import { calculateDistance, formatDistance } from "@/lib/utils/distance"
import { AppliedFilters } from "@/lib/filters/filters.types"
import type { LightRestaurant } from "../types"
import { deduplicatedFetch } from "@/lib/utils/request-deduplication"
import { getBestAvailableRating, formatRating } from "@/lib/utils/ratingCalculation"
import EateryGridSkeleton from "./EateryGridSkeleton"

// Import the mock data generator (fallback)
import { generateMockRestaurants, type MockRestaurant } from "@/lib/mockData/restaurants"

interface EateryGridProps {
  category?: string
  searchQuery?: string
  showDistance?: boolean
  showRating?: boolean
  showServices?: boolean
  scrollContainerRef: RefObject<HTMLDivElement>
  userLocation?: { latitude: number; longitude: number } | null
  useRealData?: boolean
  activeFilters?: AppliedFilters
  onCardClick?: (restaurant: LightRestaurant) => void
}

export default function EateryGrid({ 
  category = "all", 
  searchQuery = "",
  showDistance: _showDistance = true, 
  showRating: _showRating = true, 
  showServices: _showServices = true,
  scrollContainerRef,
  userLocation,
  useRealData = true,
  activeFilters = {},
  onCardClick
}: EateryGridProps) {
  const [restaurants, setRestaurants] = useState<LightRestaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [backendError, setBackendError] = useState(false)
  const [errorType, setErrorType] = useState<'network' | 'timeout' | 'server' | 'not_found' | 'unknown' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const isRetryingRef = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Transform restaurant data for UnifiedCard - memoized to prevent unnecessary recalculations
  const transformRestaurant = useCallback((restaurant: LightRestaurant, userLoc: typeof userLocation) => {
    // Calculate distance if user location is available
    let distanceText = ''
    
    if (userLoc && restaurant.latitude !== undefined && restaurant.longitude !== undefined) {
      const distance = calculateDistance(
        userLoc.latitude,
        userLoc.longitude,
        restaurant.latitude,
        restaurant.longitude
      )
      distanceText = formatDistance(distance)
    }

    const finalDistance = distanceText || (userLoc ? '' : restaurant.zip_code || '')

    return {
      ...restaurant,
      distance: userLoc && restaurant.latitude !== undefined && restaurant.longitude !== undefined 
        ? calculateDistance(userLoc.latitude, userLoc.longitude, restaurant.latitude, restaurant.longitude)
        : 0,
      // Store formatted distance separately for display
      formattedDistance: finalDistance
    }
  }, [])

  // Memoize transformed restaurants - only recalculate when restaurants or userLocation actually changes
  const transformedRestaurants = useMemo(() => {
    return restaurants.map(restaurant => transformRestaurant(restaurant, userLocation))
  }, [restaurants, userLocation, transformRestaurant])

  // Real API function with cursor-based pagination
  const fetchRestaurants = useCallback(async (limit: number, cursor?: string, params?: string, timeoutMs: number = 8000) => {
    try {
      // Build API URL with parameters - use frontend API route
      const apiUrl = new URL('/api/v4/restaurants', window.location.origin)
      apiUrl.searchParams.set('limit', limit.toString())
      apiUrl.searchParams.set('include_reviews', 'true') // Include Google reviews for consistent rating calculation
      
      // Add cursor for pagination
      if (cursor) {
        apiUrl.searchParams.set('cursor', cursor)
      }
      
      // Add location and other parameters
      if (params) {
        const searchParams = new URLSearchParams(params)
        searchParams.forEach((value, key) => {
          if (value && value.trim() !== '') {
            apiUrl.searchParams.set(key, value)
          }
        })
      }

      // Add timeout to fetch (shorter than API timeout to fail fast)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, timeoutMs)

      const data = await deduplicatedFetch(apiUrl.toString(), {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      clearTimeout(timeoutId)
      
      if (data.success === false && data.message?.includes('temporarily unavailable')) {
        throw new Error('Backend service unavailable')
      }

      // Handle cursor-based endpoint response format
      const responseRestaurants = data.items || []
      const newNextCursor = data.next_cursor
      const hasMoreData = !!newNextCursor
      
      console.log('fetchRestaurants cursor response - restaurants:', responseRestaurants.length, 'hasMore:', hasMoreData, 'nextCursor:', newNextCursor)
      
      return {
        restaurants: responseRestaurants,
        hasMore: hasMoreData,
        nextCursor: newNextCursor,
        limit: data.limit || limit
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted due to timeout')
        throw new Error('TIMEOUT: Request timed out - backend may be unreachable')
      }
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('TimeoutError'))) {
        console.log('Timeout error detected')
        throw new Error('TIMEOUT: Request timed out - backend may be unreachable')
      }
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.log('Network error detected')
        throw new Error('NETWORK: Unable to connect to server - check your internet connection')
      }
      if (error instanceof Error && error.message.includes('404')) {
        console.log('Not found error detected')
        throw new Error('NOT_FOUND: Restaurant service endpoint not found')
      }
      if (error instanceof Error && error.message.includes('500')) {
        console.log('Server error detected')
        throw new Error('SERVER: Internal server error - please try again later')
      }
      console.error('Error fetching restaurants:', error)
      throw error
    }
  }, [])

  // Build search parameters for API calls
  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams()
    
    // Add active filters to search parameters with proper API parameter mapping
    if (activeFilters) {
      
      // Map frontend filter names to API parameter names
      if (activeFilters.q && activeFilters.q.trim()) {
        params.set('search', activeFilters.q.trim())
      }
    }
    
    // Override with searchQuery if provided (from header search)
    if (searchQuery && searchQuery.trim() !== '') {
      params.set('search', searchQuery.trim())
    }
    
    if (category && category !== 'all') {
      params.set('kosher_category', category)
    }
    
    // Continue with other active filters
    if (activeFilters) {
      if (activeFilters.category) {
        params.set('kosher_category', activeFilters.category)
      }
      
      if (activeFilters.agency) {
        params.set('certifying_agency', activeFilters.agency)
      }
      
      if (activeFilters.distanceMi) {
        // Convert miles to meters for backend
        const radiusMeters = activeFilters.distanceMi * 1609.34
        params.set('radius_m', radiusMeters.toString())
      }
      
      if (activeFilters.priceRange && Array.isArray(activeFilters.priceRange)) {
        const [min, max] = activeFilters.priceRange
        if (min) params.set('price_min', min.toString())
        if (max) params.set('price_max', max.toString())
      }
      
      if (activeFilters.ratingMin) {
        params.set('min_rating', activeFilters.ratingMin.toString())
      }
      
      if (activeFilters.hoursFilter) {
        params.set('hours_filter', activeFilters.hoursFilter)
      }
      
      if (activeFilters.openNow) {
        params.set('open_now', 'true')
      }
    }
    
    // Add location parameters for distance sorting
    if (userLocation) {
      params.set('lat', userLocation.latitude.toString())
      params.set('lng', userLocation.longitude.toString())
    }
    
    return params.toString()
  }, [searchQuery, category, activeFilters, userLocation])

  // Load more items using cursor-based pagination
  const loadMoreItems = useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);

    try {
      if (useRealData && !backendError) {
        // Try real API first with cursor-based pagination
        const response = await fetchRestaurants(24, nextCursor || undefined, buildSearchParams());
        setRestaurants((prev) => {
          // Deduplicate by id to prevent duplicate restaurants
          const existingIds = new Set(prev.map((r: LightRestaurant) => r.id));
          const newRestaurants = response.restaurants.filter((r: LightRestaurant) => !existingIds.has(r.id));
          return [...prev, ...newRestaurants];
        });
        setHasMore(response.hasMore);
        setNextCursor(response.nextCursor || null);
      } else {
        // Use mock data (fallback or when backend is in error state)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const newItems: MockRestaurant[] = [];
        for (let i = 0; i < 24; i++) {
          const itemIndex = restaurants.length + i;
          if (itemIndex < 50) { // Limit mock data to 50 items
            newItems.push(generateMockRestaurants(1)[0]);
          }
        }
        
        setRestaurants((prev) => [...prev, ...newItems]);
        setHasMore(restaurants.length + newItems.length < 50);
      }
    } catch (error) {
      console.error('Error loading more items:', error);
      
      // Parse error type and message
      if (error instanceof Error) {
        if (error.message.startsWith('TIMEOUT:')) {
          setErrorType('timeout')
          setErrorMessage('Request timed out. The server may be slow or unreachable.')
        } else if (error.message.startsWith('NETWORK:')) {
          setErrorType('network')
          setErrorMessage('Network connection failed. Please check your internet connection.')
        } else if (error.message.startsWith('SERVER:')) {
          setErrorType('server')
          setErrorMessage('Server error occurred. Please try again later.')
        } else if (error.message.startsWith('NOT_FOUND:')) {
          setErrorType('not_found')
          setErrorMessage('Service endpoint not found. Please contact support.')
        } else {
          setErrorType('unknown')
          setErrorMessage('An unexpected error occurred. Please try again.')
        }
      } else {
        setErrorType('unknown')
        setErrorMessage('An unexpected error occurred. Please try again.')
      }
      
      // Switch to mock data permanently after error
      console.log('Backend unreachable, switching to mock data');
      setBackendError(true);
      
      // Fall back to mock data
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newItems: MockRestaurant[] = [];
      for (let i = 0; i < 24; i++) {
        const itemIndex = restaurants.length + i;
        if (itemIndex < 50) {
          newItems.push(generateMockRestaurants(1)[0]);
        }
      }
      
      setRestaurants((prev) => [...prev, ...newItems]);
      setHasMore(restaurants.length + newItems.length < 50);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, useRealData, backendError, fetchRestaurants, buildSearchParams, restaurants.length, nextCursor]);

  // Unified effect for all data loading - prevents duplicate API calls
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      // Reset state for new data load
      setRestaurants([])
      setHasMore(true)
      setNextCursor(null)
      setBackendError(false)
      setErrorType(null)
      setErrorMessage('')
      setIsInitialLoad(true)
      isRetryingRef.current = false
      
      const loadInitialItems = async () => {
        if (isRetryingRef.current) return
        
        setLoading(true)
        let currentRetryCount = 0
        
        const attemptFetch = async (): Promise<void> => {
          try {
            if (useRealData && currentRetryCount < 3) {
              // Try real API first with cursor-based pagination
              const response = await fetchRestaurants(24, undefined, buildSearchParams())
              setRestaurants(response.restaurants)
              setHasMore(response.hasMore)
              setNextCursor(response.nextCursor || null)
              isRetryingRef.current = false
            } else {
              // Use mock data (fallback or when useRealData is false or max retries reached)
              await new Promise((resolve) => setTimeout(resolve, 1000))
              const mockItems = generateMockRestaurants(24)
              setRestaurants(mockItems)
              setHasMore(true)
              
              if (currentRetryCount >= 3) {
                console.log('Backend unreachable after 3 attempts, switching to mock data')
                setBackendError(true)
              }
            }
          } catch (error) {
            console.error('Error loading initial items:', error)
            currentRetryCount++
            
            // Parse error type and message
            if (error instanceof Error) {
              if (error.message.startsWith('TIMEOUT:')) {
                setErrorType('timeout')
                setErrorMessage('Request timed out. The server may be slow or unreachable.')
              } else if (error.message.startsWith('NETWORK:')) {
                setErrorType('network')
                setErrorMessage('Network connection failed. Please check your internet connection.')
              } else if (error.message.startsWith('SERVER:')) {
                setErrorType('server')
                setErrorMessage('Server error occurred. Please try again later.')
              } else if (error.message.startsWith('NOT_FOUND:')) {
                setErrorType('not_found')
                setErrorMessage('Service endpoint not found. Please contact support.')
              } else {
                setErrorType('unknown')
                setErrorMessage('An unexpected error occurred. Please try again.')
              }
            } else {
              setErrorType('unknown')
              setErrorMessage('An unexpected error occurred. Please try again.')
            }
            
            // Check if it's a timeout error - fail faster for timeouts
            const isTimeoutError = error instanceof Error && 
              (error.message.includes('timeout') || 
               error.message.includes('timed out') || 
               error.message.includes('unreachable'))
            
            if (isTimeoutError && currentRetryCount >= 2) {
              // Fail faster for timeout errors - only retry once
              console.log('Timeout error detected, switching to mock data after 2 attempts')
              setBackendError(true)
              
              const mockItems = generateMockRestaurants(24)
              setRestaurants(mockItems)
              setHasMore(true)
              return
            }
            
            if (currentRetryCount < 3) {
              // Retry after a delay (shorter for timeout errors)
              const delay = isTimeoutError ? 1000 : 2000
              setTimeout(() => {
                attemptFetch()
              }, delay)
              return
            } else {
              // Max retries reached, fall back to mock data
              console.log('Backend unreachable after 3 attempts, switching to mock data')
              setBackendError(true)
              
              const mockItems = generateMockRestaurants(24)
              setRestaurants(mockItems)
              setHasMore(true)
            }
          }
        }
        
        await attemptFetch()
        setLoading(false)
        setIsInitialLoad(false)
      }
      
      loadInitialItems()
    }, 300) // Reduced debounce to 300ms for better responsiveness
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [category, searchQuery, userLocation, activeFilters, useRealData, buildSearchParams, fetchRestaurants])

  // Infinite scroll handler for the scrollable container
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      
      // Load more when user is within 200px of the bottom of the container
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMoreItems()
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [loadMoreItems, scrollContainerRef])

  // Server-side filtering handles all filters, so we use transformedRestaurants directly
  const filteredRestaurants = transformedRestaurants

  // Backend handles distance sorting, so we use filteredRestaurants directly
  const sortedRestaurants = filteredRestaurants

  // Handle card click
  const handleCardClick = (restaurant: LightRestaurant) => {
    if (onCardClick) {
      onCardClick(restaurant)
    } else {
      // Default navigation - use ID-based routing for reliability
      window.location.href = `/eatery/${restaurant.id}`
    }
  }

  // Get the best available rating from restaurant data
  const getRestaurantRating = useCallback((restaurant: LightRestaurant) => {
    const rating = getBestAvailableRating(restaurant);
    const formattedRating = formatRating(rating);
    
    // Debug logging to see what's happening with ratings
    if (process.env.NODE_ENV === 'development') {
      console.log(`Rating for ${restaurant.name} (ID: ${restaurant.id}):`, {
        google_rating: restaurant.google_rating,
        hasGoogleReviews: !!(restaurant as any).google_reviews,
        googleReviewsLength: (restaurant as any).google_reviews ? (restaurant as any).google_reviews.length : 0,
        calculatedRating: rating,
        formattedRating,
        willShowBadge: !!formattedRating
      });
    }
    
    return formattedRating;
  }, [])

  // Show skeleton during initial load
  if (isInitialLoad && loading) {
    return <EateryGridSkeleton count={8} showBackendError={backendError} />
  }

  // Show no results state
  if (sortedRestaurants.length === 0 && !loading && !isInitialLoad) {
    return (
      <div className="text-center py-12">
        <Search className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No restaurants found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      {/* Enhanced Error Status Indicator */}
      {backendError && errorType && (
        <div className={`mb-4 p-4 rounded-lg border ${
          errorType === 'network' ? 'bg-red-50 border-red-200' :
          errorType === 'timeout' ? 'bg-orange-50 border-orange-200' :
          errorType === 'server' ? 'bg-yellow-50 border-yellow-200' :
          errorType === 'not_found' ? 'bg-purple-50 border-purple-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {errorType === 'network' && <WifiOff className="h-5 w-5 text-red-400" />}
              {errorType === 'timeout' && <AlertTriangle className="h-5 w-5 text-orange-400" />}
              {errorType === 'server' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
              {errorType === 'not_found' && <AlertTriangle className="h-5 w-5 text-purple-400" />}
              {errorType === 'unknown' && <AlertTriangle className="h-5 w-5 text-gray-400" />}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                errorType === 'network' ? 'text-red-800' :
                errorType === 'timeout' ? 'text-orange-800' :
                errorType === 'server' ? 'text-yellow-800' :
                errorType === 'not_found' ? 'text-purple-800' :
                'text-gray-800'
              }`}>
                {errorType === 'network' && 'Connection Problem'}
                {errorType === 'timeout' && 'Request Timeout'}
                {errorType === 'server' && 'Server Error'}
                {errorType === 'not_found' && 'Service Not Found'}
                {errorType === 'unknown' && 'Service Unavailable'}
              </h3>
              <div className={`mt-2 text-sm ${
                errorType === 'network' ? 'text-red-700' :
                errorType === 'timeout' ? 'text-orange-700' :
                errorType === 'server' ? 'text-yellow-700' :
                errorType === 'not_found' ? 'text-purple-700' :
                'text-gray-700'
              }`}>
                <p className="mb-2">{errorMessage}</p>
                <p className="text-xs opacity-75">
                  Showing sample data. Some features may be limited.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              <button
                onClick={() => {
                  setBackendError(false)
                  setErrorType(null)
                  setErrorMessage('')
                  // Trigger a reload by clearing restaurants and setting loading
                  setRestaurants([])
                  setLoading(true)
                  setIsInitialLoad(true)
                }}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  errorType === 'network' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                  errorType === 'timeout' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                  errorType === 'server' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                  errorType === 'not_found' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                  'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Grid Layout - Using ShulGrid's simple Tailwind approach */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sortedRestaurants.map((restaurant, index) => {
          return (
            <div key={`restaurant-${restaurant.id}-${index}`}>
              <Card
                data={{
                  id: String(restaurant.id),
                  imageUrl: restaurant.image_url,
                  title: restaurant.name,
                  badge: getRestaurantRating(restaurant),
                  subtitle: restaurant.price_range || '',
                  additionalText: (restaurant as any).formattedDistance || '',
                  showHeart: true,
                  isLiked: false,
                  kosherCategory: restaurant.kosher_category || restaurant.cuisine || '',
                  city: restaurant.address,
                  imageTag: restaurant.kosher_category || '',
                }}
                variant="default"
                showStarInBadge={true}
                onCardClick={() => handleCardClick(restaurant)}
                priority={index === 0}
                className="w-full h-full"
              />
            </div>
          )
        })}
      </div>

      {/* Loading State */}
      {loading && !isInitialLoad && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-gray-600">Loading more restaurants...</span>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !loading && sortedRestaurants.length > 0 && (
        <div className="flex justify-center py-8">
          <button
            onClick={loadMoreItems}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Load More Restaurants
          </button>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && sortedRestaurants.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Showing all {sortedRestaurants.length} restaurants
        </div>
      )}
    </div>
  )
}
