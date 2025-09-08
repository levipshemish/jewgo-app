"use client"
import { useState, useEffect, useCallback, useRef, RefObject, useMemo } from "react"
import Card from "@/components/core/cards/Card"
import { Loader2, Search } from "lucide-react"
import { calculateDistance, formatDistance } from "@/lib/utils/distance"
import { AppliedFilters } from "@/lib/filters/filters.types"
import type { LightRestaurant } from "../types"
import { deduplicatedFetch } from "@/lib/utils/request-deduplication"
import { isRestaurantOpenDuringPeriod } from "@/lib/utils/hours"
import { getBestAvailableRating, formatRating } from "@/lib/utils/ratingCalculation"

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
  const [backendError, setBackendError] = useState(false)
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
  const fetchRestaurants = useCallback(async (limit: number, offset: number = 0, params?: string, timeoutMs: number = 8000) => {
    try {
      // Build API URL with parameters - use unified endpoint for now
      const apiUrl = new URL('/api/restaurants/unified', window.location.origin)
      apiUrl.searchParams.set('limit', limit.toString())
      apiUrl.searchParams.set('offset', offset.toString())
      
      // For cursor-based pagination, we don't use offset
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

      // Handle unified endpoint response format
      const responseRestaurants = data.data?.restaurants || []
      const total = data.data?.total || data.total || 0
      const hasMoreData = data.data?.hasMore !== undefined ? data.data.hasMore : (offset + limit) < total
      
      console.log('fetchRestaurants unified response - restaurants:', responseRestaurants.length, 'hasMore:', hasMoreData)
      
      return {
        restaurants: responseRestaurants,
        hasMore: hasMoreData,
        limit: data.data?.limit || limit
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted due to timeout')
        throw new Error('Request timed out - backend may be unreachable')
      }
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('TimeoutError'))) {
        console.log('Timeout error detected')
        throw new Error('Request timed out - backend may be unreachable')
      }
      console.error('Error fetching restaurants:', error)
      throw error
    }
  }, [])

  // Build search parameters for API calls
  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams()
    
    if (searchQuery && searchQuery.trim() !== '') {
      params.append('search', searchQuery.trim())
    }
    
    if (category && category !== 'all') {
      params.append('kosher_category', category)
    }

    // Add active filters to search parameters
    if (activeFilters) {
      for (const [key, value] of Object.entries(activeFilters)) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' && !value.trim()) continue;
        if (Array.isArray(value)) {
          if (value.length === 0) continue;
          for (const v of value) params.append(key, String(v));
        } else {
          params.set(key, String(value));
        }
      }
    }

    // Add hours filter if specified
    if (activeFilters?.hoursFilter) {
      params.set('hoursFilter', activeFilters.hoursFilter);
    }
    
    return params.toString()
  }, [searchQuery, category, activeFilters])

  // Load more items using offset-based pagination
  const loadMoreItems = useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);

    try {
      if (useRealData && !backendError) {
        // Try real API first with offset-based pagination
        const currentPage = Math.floor(restaurants.length / 24);
        const offset = currentPage * 24;
        const response = await fetchRestaurants(24, offset, buildSearchParams());
        setRestaurants((prev) => [...prev, ...response.restaurants]);
        setHasMore(response.hasMore);
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
  }, [loading, hasMore, useRealData, backendError, fetchRestaurants, buildSearchParams, restaurants.length]);

  // Unified effect for all data loading - prevents duplicate API calls
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      // Reset state for new data load
      setRestaurants([])
      setHasMore(true)
      setBackendError(false)
      isRetryingRef.current = false
      
      const loadInitialItems = async () => {
        if (isRetryingRef.current) return
        
        setLoading(true)
        let currentRetryCount = 0
        
        const attemptFetch = async (): Promise<void> => {
          try {
            if (useRealData && currentRetryCount < 3) {
              // Try real API first with offset-based pagination
              const response = await fetchRestaurants(24, 0, buildSearchParams())
              setRestaurants(response.restaurants)
              setHasMore(response.hasMore)
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

  // Filter transformed restaurants based on category, search, and hours
  const filteredRestaurants = transformedRestaurants.filter(restaurant => {
    // Category filter
    if (category !== "all") {
      if (restaurant.kosher_category?.toLowerCase() !== category.toLowerCase()) {
        return false
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        restaurant.name?.toLowerCase().includes(query) ||
        restaurant.address?.toLowerCase().includes(query) ||
        restaurant.kosher_category?.toLowerCase().includes(query) ||
        restaurant.cuisine?.toLowerCase().includes(query)
      )
      if (!matchesSearch) {
        return false
      }
    }

    // Hours filter - check if restaurant is open during specified time period
    if (activeFilters?.hoursFilter) {
      // Check if restaurant has hours data
      const hoursData = (restaurant as any).hours_of_operation || (restaurant as any).hours_json || (restaurant as any).hours;
      if (!hoursData) {
        return false // Exclude restaurants without hours data
      }
      
      // Use the hours utility function to check if restaurant is open during the specified period
      const isOpenDuringPeriod = isRestaurantOpenDuringPeriod(hoursData, activeFilters.hoursFilter as any);
      if (!isOpenDuringPeriod) {
        return false
      }
    }

    return true
  })

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
        formattedRating: formattedRating,
        willShowBadge: !!formattedRating
      });
    }
    
    return formattedRating;
  }, [])

  if (sortedRestaurants.length === 0 && !loading) {
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
      {/* Backend Status Indicator */}
      {backendError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Backend Service Unavailable
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Restaurant service is temporarily unavailable. Please try again later.</p>
              </div>
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
                priority={false}
                className="w-full h-full"
              />
            </div>
          )
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
