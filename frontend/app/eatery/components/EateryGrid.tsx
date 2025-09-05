"use client"
import { useState, useEffect, useCallback, useRef, RefObject } from "react"
import UnifiedCard from "@/components/ui/UnifiedCard"
import { Loader2, Search } from "lucide-react"
import { calculateDistance, formatDistance } from "@/lib/utils/distance"
import { AppliedFilters } from "@/lib/filters/filters.types"
import { eaterySlug } from "@/lib/utils/slug"
import type { LightRestaurant } from "../types"

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
  const [page, setPage] = useState(0)
  const [backendError, setBackendError] = useState(false)
  const isRetryingRef = useRef(false)

  // Real API function for restaurants with offset-based pagination for infinite scroll
  const fetchRestaurants = useCallback(async (limit: number, offset: number = 0, params?: string, timeoutMs: number = 8000) => {
    try {
      // Build API URL with parameters
      const apiUrl = new URL('/api/restaurants-with-filters', window.location.origin)
      apiUrl.searchParams.set('limit', limit.toString())
      apiUrl.searchParams.set('offset', offset.toString())

      if (params) {
        const searchParams = new URLSearchParams(params)
        searchParams.forEach((value, key) => {
          if (value && value.trim() !== '') {
            apiUrl.searchParams.set(key, value)
          }
        })
      }

      console.log('fetchRestaurants called with URL:', apiUrl.toString())

      // Add timeout to fetch (shorter than API timeout to fail fast)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log('Frontend timeout - aborting request')
      }, timeoutMs)

      const response = await fetch(apiUrl.toString(), {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      clearTimeout(timeoutId)

      console.log('fetchRestaurants response status:', response.status)

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Backend server error: ${response.status}`)
        } else if (response.status >= 400) {
          throw new Error(`Client error: ${response.status}`)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('fetchRestaurants response data:', data)
      
      if (data.success === false && data.message?.includes('temporarily unavailable')) {
        throw new Error('Backend service unavailable')
      }

      // Get total from multiple possible locations in the response
      const total = data.data?.total || data.total || data.pagination?.total || 0
      const currentOffset = offset
      
      // Check if backend provides hasMore/hasNext, otherwise calculate it
      let hasMoreData = data.pagination?.hasMore !== undefined 
        ? data.pagination.hasMore 
        : data.hasNext !== undefined 
        ? data.hasNext 
        : (currentOffset + limit) < total
      
      // Fallback: If we got a full page of results but total is 0 or incorrect,
      // assume there might be more data (similar to shuls page logic)
      const restaurantsCount = data.data?.restaurants?.length || 0
      if (total === 0 && restaurantsCount === limit) {
        hasMoreData = true
        console.log('Fallback: total is 0 but got full page, assuming hasMore = true')
      }
      
      // Additional fallback: If API says hasMore is false but we got a full page on first load,
      // override it to true (API might be too conservative)
      if (!hasMoreData && offset === 0 && restaurantsCount === limit) {
        hasMoreData = true
        console.log('Fallback: API says no more but got full first page, overriding hasMore = true')
      }
      
      console.log('fetchRestaurants calculated hasMore:', hasMoreData, 'total:', total, 'currentOffset:', currentOffset, 'limit:', limit)
      console.log('API response structure:', {
        'data.total': data.data?.total,
        'data.total (top level)': data.total,
        'pagination.total': data.pagination?.total,
        'pagination.hasMore': data.pagination?.hasMore,
        'hasNext': data.hasNext,
        'restaurants count': data.data?.restaurants?.length
      })
      
      return {
        restaurants: data.data?.restaurants || [],
        total,
        hasMore: hasMoreData,
        limit: data.pagination?.limit || limit
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

    // Add distance sorting when location is available
    if (userLocation) {
      params.set('sortBy', 'distance');
      params.set('userLat', userLocation.latitude.toString());
      params.set('userLng', userLocation.longitude.toString());
    }
    
    return params.toString()
  }, [searchQuery, category, activeFilters, userLocation])

  // Load more items in batches of 24
  const loadMoreItems = useCallback(async () => {
    console.log('loadMoreItems called - loading:', loading, 'hasMore:', hasMore, 'page:', page);
    if (loading || !hasMore) {
      console.log('loadMoreItems early return - loading:', loading, 'hasMore:', hasMore);
      return;
    }

    setLoading(true);

    try {
      if (useRealData && !backendError) {
        // Try real API first
        const currentPage = page;
        const offset = currentPage * 24;
        console.log('Loading more items - page:', currentPage, 'offset:', offset);
        const response = await fetchRestaurants(24, offset, buildSearchParams());
        console.log('API response - hasMore:', response.hasMore, 'restaurants count:', response.restaurants.length);
        setRestaurants((prev) => [...prev, ...response.restaurants]);
        setHasMore(response.hasMore);
        setPage((prev) => prev + 1);
      } else {
        // Use mock data (fallback or when backend is in error state)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const newItems: MockRestaurant[] = [];
        for (let i = 0; i < 24; i++) {
          const itemIndex = page * 24 + i;
          if (itemIndex < 50) { // Limit mock data to 50 items
            newItems.push(generateMockRestaurants(1)[0]);
          }
        }
        
        setRestaurants((prev) => [...prev, ...newItems]);
        setHasMore(newItems.length === 24 && page * 24 + newItems.length < 50);
        setPage((prev) => prev + 1);
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
        const itemIndex = page * 24 + i;
        if (itemIndex < 50) {
          newItems.push(generateMockRestaurants(1)[0]);
        }
      }
      
      setRestaurants((prev) => [...prev, ...newItems]);
      setHasMore(newItems.length === 24 && page * 24 + newItems.length < 50);
      setPage((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, useRealData, backendError, fetchRestaurants, buildSearchParams]);

  // Load initial items when component mounts or category/search changes
  useEffect(() => {
    setRestaurants([])
    setPage(0)
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
            // Try real API first
            const response = await fetchRestaurants(24, 0, buildSearchParams())
            console.log('Initial load - API response - hasMore:', response.hasMore, 'restaurants count:', response.restaurants.length);
            setRestaurants(response.restaurants)
            setHasMore(response.hasMore)
            isRetryingRef.current = false
            setPage(1)
          } else {
            // Use mock data (fallback or when useRealData is false or max retries reached)
            await new Promise((resolve) => setTimeout(resolve, 1000))
            const mockItems = generateMockRestaurants(24)
            setRestaurants(mockItems)
            setHasMore(true)
            setPage(1)
            
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
            setPage(1)
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
            setPage(1)
          }
        }
      }
      
      await attemptFetch()
      setLoading(false)
    }
    
    loadInitialItems()
  }, [category, searchQuery, useRealData, buildSearchParams, fetchRestaurants, activeFilters])

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

  // Transform restaurant data for UnifiedCard
  const transformRestaurant = useCallback((restaurant: LightRestaurant) => {
    // Calculate distance if user location is available
    let distanceText = ''
    if (userLocation && restaurant.latitude !== undefined && restaurant.longitude !== undefined) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        restaurant.latitude,
        restaurant.longitude
      )
      distanceText = formatDistance(distance)
    }

    return {
      ...restaurant,
      distance: distanceText
    }
  }, [userLocation])

  // Filter restaurants based on category and search
  const filteredRestaurants = restaurants.filter(restaurant => {
    // Category filter
    if (category !== "all") {
      if (restaurant.kosher_category?.toLowerCase() !== category.toLowerCase()) {
        return false
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        restaurant.name?.toLowerCase().includes(query) ||
        restaurant.address?.toLowerCase().includes(query) ||
        restaurant.kosher_category?.toLowerCase().includes(query) ||
        restaurant.cuisine?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Handle card click
  const handleCardClick = (restaurant: LightRestaurant) => {
    if (onCardClick) {
      onCardClick(restaurant)
    } else {
      // Default navigation
      window.location.href = `/eatery/${eaterySlug(restaurant.name, restaurant.id)}`
    }
  }

  // Memoize the toFixedRating function
  const toFixedRating = useCallback((val: number | string | undefined) => {
    const n = typeof val === 'number' ? val : Number.parseFloat(String(val ?? ''))
    return Number.isFinite(n) ? n.toFixed(1) : ''
  }, [])

  if (filteredRestaurants.length === 0 && !loading) {
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
        {filteredRestaurants.map((restaurant, index) => {
          const transformedRestaurant = transformRestaurant(restaurant)
          return (
            <div key={`restaurant-${restaurant.id}-${index}`}>
              <UnifiedCard
                data={{
                  id: String(restaurant.id),
                  imageUrl: restaurant.image_url,
                  title: restaurant.name,
                  badge: toFixedRating(restaurant.google_rating),
                  subtitle: restaurant.price_range || '',
                  additionalText: transformedRestaurant.distance,
                  showHeart: true,
                  isLiked: false,
                  kosherCategory: restaurant.kosher_category || restaurant.cuisine || '',
                  city: restaurant.address,
                  imageTag: restaurant.kosher_category || '',
                }}
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
      {hasMore && !loading && filteredRestaurants.length > 0 && (
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
      {!hasMore && filteredRestaurants.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Showing all {filteredRestaurants.length} restaurants
        </div>
      )}
    </div>
  )
}
