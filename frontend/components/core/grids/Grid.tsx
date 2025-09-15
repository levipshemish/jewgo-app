"use client"
import { useState, useEffect, useCallback, useRef, RefObject } from "react"
import Card, { CardData } from "../cards/Card"
import { Loader2, Search } from "lucide-react"
import { calculateDistance, formatDistance } from "@/lib/utils/distance"
import { AppliedFilters } from "@/lib/filters/filters.types"

// Import the mock data generator (fallback)
import { generateMockShuls, type MockShul } from "@/lib/mockData/shuls"

interface GridProps {
  category?: string
  searchQuery?: string
  showDistance?: boolean
  showRating?: boolean
  showServices?: boolean
  scrollContainerRef: RefObject<HTMLDivElement>
  userLocation?: { latitude: number; longitude: number } | null
  useRealData?: boolean
  activeFilters?: AppliedFilters
  onCardClick?: (item: any) => void
  dataType?: 'shuls' | 'restaurants' | 'marketplace'
}

// Real shul type matching the database schema
interface RealShul {
  id: number
  name: string
  description?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  latitude?: number
  longitude?: number
  phone_number?: string
  website?: string
  email?: string
  shul_type?: string
  shul_category?: string
  denomination?: string
  business_hours?: string
  hours_parsed?: boolean
  timezone?: string
  has_daily_minyan?: boolean
  has_shabbat_services?: boolean
  has_holiday_services?: boolean
  has_women_section?: boolean
  has_mechitza?: boolean
  has_separate_entrance?: boolean
  distance?: string
  distance_miles?: number
  rating?: number
  review_count?: number
  star_rating?: number
  google_rating?: number
  image_url?: string
  logo_url?: string
  has_parking?: boolean
  has_disabled_access?: boolean
  has_kiddush_facilities?: boolean
  has_social_hall?: boolean
  has_library?: boolean
  has_hebrew_school?: boolean
  has_adult_education?: boolean
  has_youth_programs?: boolean
  has_senior_programs?: boolean
  rabbi_name?: string
  rabbi_phone?: string
  rabbi_email?: string
  religious_authority?: string
  community_affiliation?: string
  kosher_certification?: string
  membership_required?: boolean
  membership_fee?: number
  fee_currency?: string
  accepts_visitors?: boolean
  visitor_policy?: string
  is_active?: boolean
  is_verified?: boolean
  created_at?: string
  updated_at?: string
  tags?: string[]
  admin_notes?: string
  specials?: string
  listing_type?: string
}

export default function Grid({ 
  category = "all", 
  searchQuery = "",
  showDistance: _showDistance = true, 
  showRating: _showRating = true, 
  showServices: _showServices = true,
  scrollContainerRef,
  userLocation,
  useRealData = false,
  activeFilters = {},
  onCardClick,
  dataType = 'shuls'
}: GridProps) {
  const [items, setItems] = useState<Array<RealShul | any>>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [backendError, setBackendError] = useState(false)
  const isRetryingRef = useRef(false)

  // Real API function with cursor-based pagination
  const fetchItems = useCallback(async (limit: number, cursor?: string, params?: string, timeoutMs: number = 8000) => {
    try {
      // Build API URL with parameters based on data type - use v5 endpoints
      let endpoint: string;
      switch (dataType) {
        case 'shuls':
          endpoint = '/api/v5/synagogues';
          break;
        case 'marketplace':
          endpoint = '/api/v5/entities';
          break;
        default:
          endpoint = '/api/v5/restaurants';
      }
      
      const apiUrl = new URL(endpoint, window.location.origin)
      apiUrl.searchParams.set('limit', limit.toString())

      // Add cursor for pagination if provided
      if (cursor) {
        apiUrl.searchParams.set('cursor', cursor)
      }

      // Add entityType for marketplace (stores)
      if (dataType === 'marketplace') {
        apiUrl.searchParams.set('entityType', 'stores');
      }

      if (params) {
        const searchParams = new URLSearchParams(params)
        searchParams.forEach((value, key) => {
          if (value && value.trim() !== '') {
            apiUrl.searchParams.set(key, value)
          }
        })
      }


      // Use unified API call with caching and deduplication
      const { unifiedApiCall } = await import('@/lib/utils/unified-api');
      const result = await unifiedApiCall(apiUrl.toString(), {
        ttl: dataType === 'shuls' ? 5 * 60 * 1000 : 2 * 60 * 1000, // Longer cache for synagogues
        deduplicate: true,
        retry: true,
        retryAttempts: 2,
        timeout: timeoutMs,
      });

      if (!result.success) {
        throw new Error(result.error || 'API call failed');
      }

      const data = result.data;
      
      if (data.success === false && data.message?.includes('temporarily unavailable')) {
        throw new Error('Backend service unavailable')
      }

      // Calculate hasMore if not provided by backend
      const total = data.total_count || data.total || 0
      const hasMoreData = data.next_cursor !== null && data.next_cursor !== undefined
      
      
      return {
        items: data.data || data.synagogues || data.products || data.listings || [],
        total,
        hasMore: hasMoreData,
        nextCursor: data.next_cursor,
        limit,
        cached: result.cached || false,
        performance: result.performance
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out - backend may be unreachable')
      }
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('TimeoutError'))) {
        throw new Error('Request timed out - backend may be unreachable')
      }
      console.error('Error fetching items:', error)
      throw error
    }
  }, [dataType])

  // Build search parameters for cursor-based API calls
  const buildSearchParams = useCallback((cursor?: string) => {
    const params = new URLSearchParams()
    
    // Add location parameters for distance sorting
    if (userLocation) {
      params.set('lat', userLocation.latitude.toString())
      params.set('lng', userLocation.longitude.toString())
    }
    
    // Add cursor for pagination
    if (cursor) {
      params.set('cursor', cursor)
    }
    
    // Set limit
    params.set('limit', '30')
    
    // Add search query
    if (searchQuery && searchQuery.trim() !== '') {
      params.append('search', searchQuery.trim())
    }
    
    // Add category filter
    if (category && category !== 'all') {
      if (dataType === 'shuls') {
        params.append('denomination', category)
      } else {
        params.append('kosher_category', category)
      }
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
    
    const paramString = params.toString();
    return paramString
  }, [searchQuery, category, activeFilters, dataType, userLocation])

  // Load more items in batches of 24
  const loadMoreItems = useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);

    try {
      if (useRealData && !backendError) {
        // Try real API first - use cursor-based pagination
        const response = await fetchItems(24, nextCursor ?? undefined, buildSearchParams());
        setItems((prev) => {
          // Deduplicate items by ID to prevent duplicates
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewItems = response.items.filter((item: any) => !existingIds.has(item.id));
          const newItems = [...prev, ...uniqueNewItems];
          return newItems;
        });
        setHasMore(response.hasMore);
        setNextCursor(response.nextCursor);
      } else {
        // Use mock data (fallback or when backend is in error state)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const newItems: MockShul[] = [];
        for (let i = 0; i < 24; i++) {
          const itemIndex = items.length + i;
          if (itemIndex < 50) { // Limit mock data to 50 items
            newItems.push(generateMockShuls(1)[0]);
          }
        }
        
        setItems((prev) => [...prev, ...newItems]);
        setHasMore(newItems.length === 24 && items.length + newItems.length < 50);
      }
    } catch (error) {
      console.error('Error loading more items:', error);
      
      // Switch to mock data permanently after error
      setBackendError(true);
      
      // Fall back to mock data
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newItems: MockShul[] = [];
      for (let i = 0; i < 24; i++) {
        const itemIndex = items.length + i;
        if (itemIndex < 50) {
          newItems.push(generateMockShuls(1)[0]);
        }
      }
      
      setItems((prev) => {
        // Deduplicate items by ID to prevent duplicates
        const existingIds = new Set(prev.map(item => item.id));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id));
        return [...prev, ...uniqueNewItems];
      });
      setHasMore(newItems.length === 24 && items.length + newItems.length < 50);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, nextCursor, useRealData, backendError, fetchItems, buildSearchParams, items.length]);

  // Load initial items when component mounts or category/search changes
  useEffect(() => {
    setItems([])
    setNextCursor(null)
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
              const response = await fetchItems(24, undefined, buildSearchParams())
              setItems(response.items)
              setHasMore(response.hasMore)
              setNextCursor(response.nextCursor)
              isRetryingRef.current = false
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            const mockItems = generateMockShuls(24)
            setItems(mockItems)
            setHasMore(true)
            
            if (currentRetryCount >= 3) {
              setBackendError(true)
            }
          }
        } catch (error) {
          console.error('Error loading initial items:', error)
          currentRetryCount++
          
          const isTimeoutError = error instanceof Error && 
            (error.message.includes('timeout') || 
             error.message.includes('timed out') || 
             error.message.includes('unreachable'))
          
          if (isTimeoutError && currentRetryCount >= 2) {
            setBackendError(true)
            
            const mockItems = generateMockShuls(24)
            setItems(mockItems)
            setHasMore(true)
            return
          }
          
          if (currentRetryCount < 3) {
            const delay = isTimeoutError ? 1000 : 2000
            setTimeout(() => {
              attemptFetch()
            }, delay)
            return
          } else {
            setBackendError(true)
            
            const mockItems = generateMockShuls(24)
            setItems(mockItems)
            setHasMore(true)
          }
        }
      }
      
      await attemptFetch()
      setLoading(false)
    }
    
    loadInitialItems()
  }, [category, searchQuery, useRealData, fetchItems, activeFilters, userLocation, buildSearchParams])

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

  // Transform item data to match Card interface
  const transformItem = useCallback((item: RealShul | any): CardData => {
    // Enhanced rating logic with better fallbacks
    const rating = item.rating || item.star_rating || item.google_rating
    const ratingText = rating && typeof rating === 'number' ? rating.toFixed(1) : undefined
    
    // Distance logic — compute from user location if available; fall back to API string
    let distanceText = ''
    if (userLocation && (item.latitude !== null) && (item.longitude !== null)) {
      const latNum = typeof item.latitude === 'number' ? item.latitude : parseFloat(String(item.latitude))
      const lngNum = typeof item.longitude === 'number' ? item.longitude : parseFloat(String(item.longitude))
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        const km = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          latNum,
          lngNum
        )
        distanceText = formatDistance(km)
      }
    } else if (item.distance && typeof item.distance === 'string' && item.distance.trim() !== '') {
      distanceText = item.distance
    }
    
    // Create subtitle based on data type
    let subtitle = ''
    if (dataType === 'shuls') {
      const denomination = item.denomination && typeof item.denomination === 'string' ? item.denomination : 'Jewish'
      const city = item.city && typeof item.city === 'string' ? item.city : 'Florida'
      subtitle = item.description && typeof item.description === 'string' ? item.description : `${denomination} synagogue in ${city}`
    } else {
      subtitle = item.price_range || item.cuisine || ''
    }
    
    return {
      id: String(item.id),
      imageUrl: item.image_url || item.logo_url || "/images/default-restaurant.webp",
      title: item.name && typeof item.name === 'string' ? item.name : 'Unnamed Item',
      badge: ratingText,
      subtitle,
      additionalText: distanceText ? `${parseFloat(distanceText.replace(/[^\d.]/g, ''))} mi away` : '',
      showHeart: true,
      isLiked: false,
      kosherCategory: item.denomination || item.kosher_category || item.cuisine || '',
      city: item.city || item.address,
      imageTag: item.denomination || item.kosher_category || item.cuisine || '',
    }
  }, [userLocation, dataType])

  // Filter items based on category and search
  const filteredItems = items.filter(item => {
    // Category filter
    if (category !== "all") {
      const itemCategory = useRealData ? (item as RealShul).denomination : item.denomination
      if (dataType === 'shuls') {
        if (itemCategory?.toLowerCase() !== category.toLowerCase()) {
          return false
        }
      } else {
        if (item.kosher_category?.toLowerCase() !== category.toLowerCase()) {
          return false
        }
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const itemName = useRealData ? (item as RealShul).name : item.name
      const itemCity = useRealData ? (item as RealShul).city : item.city
      const itemState = useRealData ? (item as RealShul).state : item.state
      const itemCategory = useRealData ? (item as RealShul).denomination : item.denomination
      const itemTags = useRealData ? (item as RealShul).tags : item.services
      
      return (
        itemName?.toLowerCase().includes(query) ||
        itemCity?.toLowerCase().includes(query) ||
        itemState?.toLowerCase().includes(query) ||
        itemCategory?.toLowerCase().includes(query) ||
        itemTags?.some((tag: string) => tag.toLowerCase().includes(query))
      )
    }

    return true
  })

  // Backend handles distance sorting, so we use filteredItems directly
  const sortedItems = filteredItems

  // Handle card click
  const handleCardClick = (item: any) => {
    if (onCardClick) {
      onCardClick(item)
    } else {
      // Default navigation - use ID-based routing for reliability
      const basePath = dataType === 'shuls' ? '/shuls' : '/eatery'
      window.location.href = `${basePath}/${item.id}`
    }
  }

  if (sortedItems.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <Search className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
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
                <p>Showing sample data. Real data will appear when the backend is accessible.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sortedItems.map((item: any, index: number) => (
          <div key={`item-${item.id}-${index}`}>
            <Card
              data={transformItem(item)}
              variant="default"
              showStarInBadge={true}
              onCardClick={() => handleCardClick(item)}
              priority={false}
              className="w-full h-full"
            />
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !loading && sortedItems.length > 0 && (
        <div className="flex justify-center py-8">
          <button
            onClick={loadMoreItems}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Load More Items
          </button>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && sortedItems.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Showing all {sortedItems.length} items
        </div>
      )}
    </div>
  )
}
