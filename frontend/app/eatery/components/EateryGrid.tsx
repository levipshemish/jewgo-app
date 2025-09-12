"use client"
import { useState, useEffect, useCallback, useRef, RefObject, useMemo } from "react"
import Card from "@/components/core/cards/Card"
import { Loader2, Search, WifiOff, AlertTriangle, RefreshCw } from "lucide-react"
import { calculateDistance, formatDistance } from "@/lib/utils/distance"
import { AppliedFilters } from "@/lib/filters/filters.types"
import type { LightRestaurant } from "../types"
// import { deduplicatedFetch } from "@/lib/utils/request-deduplication"
import { getBestAvailableRating, formatRating } from "@/lib/utils/ratingCalculation"
import EateryGridSkeleton from "./EateryGridSkeleton"
import { fetchRestaurants as apiFetchRestaurants } from "@/lib/api/restaurants"

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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [backendError, setBackendError] = useState(false)
  const [errorType, setErrorType] = useState<'network' | 'timeout' | 'server' | 'not_found' | 'unknown' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const isRetryingRef = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Transform restaurant data for UnifiedCard - memoized to prevent unnecessary recalculations
  const transformRestaurant = useCallback((restaurant: LightRestaurant, userLoc: typeof userLocation) => {
    // Use backend-calculated distance if available, otherwise calculate locally
    let distance = restaurant.distance
    let distanceText = ''
    
    // Check if backend provided a distance value (including 0)
    if (distance !== undefined && distance !== null) {
      // Use backend-calculated distance (already in miles)
      console.log(`Using backend distance for ${restaurant.name}: ${distance} miles`)
      
      // Special debug for Mizrachi restaurants
      if (restaurant.name && restaurant.name.toLowerCase().includes('mizrachi')) {
        console.warn(`Mizrachi restaurant distance: ${restaurant.name} = ${distance} miles`)
      }
      
      // Format miles directly
      if (distance < 0.1) {
        distanceText = `${Math.round(distance * 5280)}ft`; // Convert to feet
      } else if (distance < 1) {
        distanceText = `${Math.round(distance * 10) / 10}mi`; // Show as 0.1, 0.2, etc.
      } else if (distance < 10) {
        distanceText = `${distance.toFixed(1)}mi`; // Show as 1.2mi, 2.5mi, etc.
      } else {
        distanceText = `${Math.round(distance)}mi`; // Show as 12mi, 25mi, etc.
      }
    } else if (userLoc && restaurant.latitude !== undefined && restaurant.longitude !== undefined) {
      // Fallback to local calculation if backend didn't provide distance
      console.log(`Backend distance not available for ${restaurant.name}, calculating locally`)
      distance = calculateDistance(
        userLoc.latitude,
        userLoc.longitude,
        restaurant.latitude,
        restaurant.longitude
      )
      distanceText = formatDistance(distance)
    } else {
      distance = 0
    }

    const finalDistance = distanceText || (userLoc ? '' : restaurant.zip_code || '')

    return {
      ...restaurant,
      distance: distance,
      // Store formatted distance separately for display
      formattedDistance: finalDistance
    }
  }, [])

  // Memoize transformed restaurants - only recalculate when restaurants or userLocation actually changes
  const transformedRestaurants = useMemo(() => {
    return restaurants.map(restaurant => transformRestaurant(restaurant, userLocation))
  }, [restaurants, userLocation, transformRestaurant])

  // Real API function with cursor-based pagination
  const fetchRestaurants = useCallback(async (limit: number, cursor?: string, params?: string, _timeoutMs: number = 8000, page?: number) => {
    try {
      // Use the restaurants API module which handles v5 endpoints
      const searchParams = new URLSearchParams(params || '')
      const location = searchParams.get('lat') && searchParams.get('lng') ? {
        latitude: parseFloat(searchParams.get('lat')!),
        longitude: parseFloat(searchParams.get('lng')!)
      } : undefined
      
      // Build filters from search params
      const filters: Record<string, any> = {}
      for (const [key, value] of searchParams.entries()) {
        if (key !== 'lat' && key !== 'lng' && key !== 'cursor') {
          filters[key] = value
        }
      }
      
      // Check if we're using distance sorting (which requires page-based pagination)
      const isDistanceSorting = searchParams.get('sort') === 'distance_asc'
      
      // Use the restaurants API module with appropriate pagination
      const response = await apiFetchRestaurants({
        page: isDistanceSorting ? (page || 1) : 1, // Use page for distance sorting
        limit,
        filters,
        location,
        cursor: isDistanceSorting ? undefined : cursor // Use cursor for non-distance sorting
      })
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch restaurants')
      }

      // Handle the response format from the restaurants API
      const responseRestaurants = response.restaurants || []
      
      // Handle pagination based on sorting type
      let hasMoreData = false
      let newNextCursor = null
      let nextPage = null
      
      // Check if we're using page-based pagination (indicated by page_N cursor format)
      const isPageBasedPagination = response.next_cursor && response.next_cursor.startsWith('page_')
      
      if (isPageBasedPagination) {
        // For page-based pagination (distance sorting and now all sorting types)
        hasMoreData = response.next_cursor !== null && responseRestaurants.length > 0
        if (hasMoreData && response.next_cursor) {
          // Extract page number from cursor like "page_2"
          const pageMatch = response.next_cursor.match(/page_(\d+)/)
          if (pageMatch) {
            nextPage = parseInt(pageMatch[1], 10)
          }
        }
        newNextCursor = response.next_cursor // Keep the page-based cursor for reference
      } else {
        // For cursor-based pagination (legacy)
        hasMoreData = response.next_cursor !== null && responseRestaurants.length > 0
        newNextCursor = response.next_cursor
      }
      
      console.log('fetchRestaurants v5 response - restaurants:', responseRestaurants.length, 'hasMore:', hasMoreData, 'nextCursor:', newNextCursor, 'isDistanceSorting:', isDistanceSorting, 'nextPage:', nextPage)
      
      return {
        restaurants: responseRestaurants,
        hasMore: hasMoreData,
        nextCursor: newNextCursor,
        nextPage: nextPage,
        limit: response.limit || limit,
        totalCount: response.total_count || null
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
      // Automatically sort by distance when location is available
      params.set('sort', 'distance_asc')
    } else {
      // Set default sort when no location is available to ensure consistent pagination
      params.set('sort', 'created_at_desc')
    }
    
    return params.toString()
  }, [searchQuery, category, activeFilters, userLocation])

  // Load more items using appropriate pagination method
  const loadMoreItems = useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);

    try {
      if (useRealData && !backendError) {
        // Check if we're using page-based pagination (indicated by page_N cursor format)
        const isPageBasedPagination = nextCursor && nextCursor.startsWith('page_')
        
        console.log('loadMoreItems - nextCursor:', nextCursor, 'isPageBasedPagination:', isPageBasedPagination)
        
        let response;
        if (isPageBasedPagination) {
          // Use page-based pagination for all sorting types that return page_N cursors
          const nextPage = currentPage + 1
          console.log('Using page-based pagination, nextPage:', nextPage)
          response = await fetchRestaurants(50, undefined, buildSearchParams(), 8000, nextPage);
          setCurrentPage(nextPage);
        } else {
          // Use cursor-based pagination for legacy cursor format
          console.log('Using cursor-based pagination, cursor:', nextCursor)
          response = await fetchRestaurants(50, nextCursor || undefined, buildSearchParams());
        }
        
        setRestaurants((prev) => {
          // Deduplicate by id to prevent duplicate restaurants
          const existingIds = new Set(prev.map((r: LightRestaurant) => r.id));
          const newRestaurants = response.restaurants
            .filter((r: any) => !existingIds.has(r.id))
            .map((r: any): LightRestaurant => ({
              id: r.id,
              name: r.name,
              address: r.address,
              city: r.city,
              state: r.state,
              zip_code: r.zip_code,
              image_url: r.image_url,
              price_range: r.price_range,
              google_rating: r.google_rating,
              google_reviews: r.google_reviews,
              kosher_category: r.kosher_category,
              cuisine: r.cuisine,
              is_open: r.is_open,
              latitude: r.latitude,
              longitude: r.longitude,
              distance: typeof r.distance === 'string' ? parseFloat(r.distance) : r.distance
            }));
          return [...prev, ...newRestaurants];
        });
        console.log('loadMoreItems response:', {
          hasMore: response.hasMore,
          nextCursor: response.nextCursor,
          totalCount: response.totalCount,
          restaurantCount: response.restaurants.length
        })
        
        setHasMore(response.hasMore);
        setNextCursor(response.nextCursor || null);
        if (response.totalCount !== null) {
          setTotalCount(response.totalCount);
        }
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
  }, [loading, hasMore, useRealData, backendError, fetchRestaurants, buildSearchParams, restaurants.length, nextCursor, currentPage]);

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
      setCurrentPage(1)
      setTotalCount(null)
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
              // Check if we're using distance sorting for initial load
              const searchParams = new URLSearchParams(buildSearchParams())
              const isDistanceSorting = searchParams.get('sort') === 'distance_asc'
              
              console.log('Initial load - sort:', searchParams.get('sort'), 'isDistanceSorting:', isDistanceSorting)
              
              // Try real API first with appropriate pagination
              const response = await fetchRestaurants(50, undefined, buildSearchParams(), 8000, isDistanceSorting ? 1 : undefined)
              setRestaurants(response.restaurants.map((r: any): LightRestaurant => ({
                id: r.id,
                name: r.name,
                address: r.address,
                city: r.city,
                state: r.state,
                zip_code: r.zip_code,
                image_url: r.image_url,
                price_range: r.price_range,
                google_rating: r.google_rating,
                google_reviews: r.google_reviews,
                kosher_category: r.kosher_category,
                cuisine: r.cuisine,
                is_open: r.is_open,
                latitude: r.latitude,
                longitude: r.longitude,
                distance: typeof r.distance === 'string' ? parseFloat(r.distance) : r.distance
              })))
              console.log('Initial load response:', {
                hasMore: response.hasMore,
                nextCursor: response.nextCursor,
                totalCount: response.totalCount,
                restaurantCount: response.restaurants.length
              })
              
              setHasMore(response.hasMore)
              setNextCursor(response.nextCursor || null)
              setCurrentPage(1) // Reset to page 1 for initial load
              if (response.totalCount !== null) {
                setTotalCount(response.totalCount);
              }
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
          {totalCount ? (
            <div>
              <p className="text-lg font-medium text-gray-900">
                All {totalCount} restaurants loaded
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Showing {sortedRestaurants.length} restaurants
              </p>
            </div>
          ) : (
            <p>Showing all {sortedRestaurants.length} restaurants</p>
          )}
        </div>
      )}
    </div>
  )
}
