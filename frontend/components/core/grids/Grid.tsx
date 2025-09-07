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
  const [page, setPage] = useState(0)
  const [backendError, setBackendError] = useState(false)
  const isRetryingRef = useRef(false)

  // Real API function for synagogues with offset-based pagination for infinite scroll
  const fetchItems = useCallback(async (limit: number, offset: number = 0, params?: string, timeoutMs: number = 8000) => {
    try {
      // Build API URL with parameters based on data type
      const endpoint = dataType === 'shuls' ? '/api/synagogues' : '/api/restaurants/unified'
      const apiUrl = new URL(endpoint, window.location.origin)
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

      console.log('fetchItems called with URL:', apiUrl.toString())

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

      console.log('fetchItems response status:', response.status)

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Backend server error: ${response.status}`)
        } else if (response.status >= 400) {
          throw new Error(`Client error: ${response.status}`)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('fetchItems response data:', data)
      
      if (data.success === false && data.message?.includes('temporarily unavailable')) {
        throw new Error('Backend service unavailable')
      }

      // Calculate hasMore if not provided by backend
      const total = data.total || 0
      const currentOffset = offset
      const hasMoreData = data.hasNext !== undefined ? data.hasNext : (currentOffset + limit) < total
      
      console.log('fetchItems calculated hasMore:', hasMoreData, 'total:', total, 'currentOffset:', currentOffset, 'limit:', limit)
      
      return {
        items: data.synagogues || data.data?.restaurants || [],
        total,
        hasMore: hasMoreData,
        limit: data.limit || limit
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
      console.error('Error fetching items:', error)
      throw error
    }
  }, [dataType])

  // Build search parameters for API calls
  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams()
    
    if (searchQuery && searchQuery.trim() !== '') {
      params.append('search', searchQuery.trim())
    }
    
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
    
    return params.toString()
  }, [searchQuery, category, activeFilters, dataType])

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
        const response = await fetchItems(24, offset, buildSearchParams());
        console.log('API response - hasMore:', response.hasMore, 'items count:', response.items.length);
        setItems((prev) => [...prev, ...response.items]);
        setHasMore(response.hasMore);
        setPage((prev) => prev + 1);
      } else {
        // Use mock data (fallback or when backend is in error state)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const newItems: MockShul[] = [];
        for (let i = 0; i < 24; i++) {
          const itemIndex = page * 24 + i;
          if (itemIndex < 50) { // Limit mock data to 50 items
            newItems.push(generateMockShuls(1)[0]);
          }
        }
        
        setItems((prev) => [...prev, ...newItems]);
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
      const newItems: MockShul[] = [];
      for (let i = 0; i < 24; i++) {
        const itemIndex = page * 24 + i;
        if (itemIndex < 50) {
          newItems.push(generateMockShuls(1)[0]);
        }
      }
      
      setItems((prev) => [...prev, ...newItems]);
      setHasMore(newItems.length === 24 && page * 24 + newItems.length < 50);
      setPage((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, useRealData, backendError, fetchItems, buildSearchParams]);

  // Load initial items when component mounts or category/search changes
  useEffect(() => {
    setItems([])
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
            const response = await fetchItems(24, 0, buildSearchParams())
            console.log('Initial load - API response - hasMore:', response.hasMore, 'items count:', response.items.length);
            setItems(response.items)
            setHasMore(response.hasMore)
            isRetryingRef.current = false
            setPage(1)
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            const mockItems = generateMockShuls(24)
            setItems(mockItems)
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
          
          const isTimeoutError = error instanceof Error && 
            (error.message.includes('timeout') || 
             error.message.includes('timed out') || 
             error.message.includes('unreachable'))
          
          if (isTimeoutError && currentRetryCount >= 2) {
            console.log('Timeout error detected, switching to mock data after 2 attempts')
            setBackendError(true)
            
            const mockItems = generateMockShuls(24)
            setItems(mockItems)
            setHasMore(true)
            setPage(1)
            return
          }
          
          if (currentRetryCount < 3) {
            const delay = isTimeoutError ? 1000 : 2000
            setTimeout(() => {
              attemptFetch()
            }, delay)
            return
          } else {
            console.log('Backend unreachable after 3 attempts, switching to mock data')
            setBackendError(true)
            
            const mockItems = generateMockShuls(24)
            setItems(mockItems)
            setHasMore(true)
            setPage(1)
          }
        }
      }
      
      await attemptFetch()
      setLoading(false)
    }
    
    loadInitialItems()
  }, [category, searchQuery, useRealData, buildSearchParams, fetchItems, activeFilters])

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

  if (filteredItems.length === 0 && !loading) {
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
        {filteredItems.map((item, index) => (
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
      {hasMore && !loading && filteredItems.length > 0 && (
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
      {!hasMore && filteredItems.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Showing all {filteredItems.length} items
        </div>
      )}
    </div>
  )
}
