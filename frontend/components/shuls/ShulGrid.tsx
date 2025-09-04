"use client"
import { useState, useEffect, useCallback, RefObject } from "react"
import ShulCard from "./ShulCard"
import { Loader2, Search } from "lucide-react"
import { calculateDistance, formatDistance } from "@/lib/utils/distance"

// Import the mock data generator (fallback)
import { generateMockShuls, type MockShul } from "@/lib/mockData/shuls"

interface ShulGridProps {
  category?: string
  searchQuery?: string
  showDistance?: boolean
  showRating?: boolean
  showServices?: boolean
  scrollContainerRef: RefObject<HTMLDivElement>
  userLocation?: { latitude: number; longitude: number } | null
  useRealData?: boolean
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

export default function ShulGrid({ 
  category = "all", 
  searchQuery = "",
  showDistance = true, 
  showRating = true, 
  showServices = true,
  scrollContainerRef,
  userLocation,
  useRealData = false
}: ShulGridProps) {
  const [shuls, setShuls] = useState<Array<RealShul | any>>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [backendError, setBackendError] = useState(false) // Track if backend is accessible
  const [retryCount, setRetryCount] = useState(0) // Track retry attempts

  // Real API function for synagogues with offset-based pagination for infinite scroll
  const fetchShuls = useCallback(async (limit: number, offset: number = 0, params?: string, timeoutMs: number = 10000) => {
    try {
      // Build API URL with parameters
      const apiUrl = new URL('/api/synagogues', window.location.origin)
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

      // Add timeout to fetch
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(apiUrl.toString(), {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Check if it's a server error (5xx) or client error (4xx)
        if (response.status >= 500) {
          throw new Error(`Backend server error: ${response.status}`)
        } else if (response.status >= 400) {
          throw new Error(`Client error: ${response.status}`)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Check if the response indicates backend is unavailable
      if (data.success === false && data.message?.includes('temporarily unavailable')) {
        throw new Error('Backend service unavailable')
      }

      return {
        shuls: data.synagogues || [],
        total: data.total || 0,
        hasMore: data.hasNext || false,
        limit: data.limit || limit
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out - backend may be unreachable')
      }
      console.error('Error fetching synagogues:', error)
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
      params.append('denomination', category)
    }
    
    return params.toString()
  }, [searchQuery, category])

  // Load more items in batches of 6 (exactly like dynamic-card-ts)
  const loadMoreItems = useCallback(async () => {
    if (loading || !hasMore || backendError) return

    setLoading(true)

    try {
      if (useRealData && !backendError && retryCount < 3) {
        // Try real API first (with retry limit)
        const currentPage = page
        const response = await fetchShuls(6, currentPage * 6, buildSearchParams())
        setShuls((prev) => [...prev, ...response.shuls])
        setHasMore(response.hasMore)
        setPage((prev) => prev + 1)
        setRetryCount(0) // Reset retry count on success
      } else {
        // Use mock data (fallback or after max retries)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        const newItems: MockShul[] = []
        for (let i = 0; i < 6; i++) {
          const itemIndex = page * 6 + i
          if (itemIndex < 50) { // Limit mock data to 50 items
            newItems.push(generateMockShuls(1)[0])
          }
        }
        
        setShuls((prev) => [...prev, ...newItems])
        setHasMore(newItems.length === 6 && page * 6 + newItems.length < 50)
        setPage((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Error loading more items:', error)
      
      // Increment retry count
      setRetryCount((prev) => prev + 1)
      
      // If we've exceeded retry limit, switch to mock data permanently
      if (retryCount >= 2) {
        console.log('Backend unreachable after 3 attempts, switching to mock data')
        setBackendError(true)
        setRetryCount(0)
      }
      
      // Fall back to mock data
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const newItems: MockShul[] = []
      for (let i = 0; i < 6; i++) {
        const itemIndex = page * 6 + i
        if (itemIndex < 50) {
          newItems.push(generateMockShuls(1)[0])
        }
      }
      
      setShuls((prev) => [...prev, ...newItems])
      setHasMore(newItems.length === 6 && page * 6 + newItems.length < 50)
      setPage((prev) => prev + 1)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, useRealData, backendError, retryCount, fetchShuls, buildSearchParams])

  // Load initial items when component mounts or category/search changes
  useEffect(() => {
    // Reset and load initial items when category or search changes
    setShuls([])
    setPage(0)
    setHasMore(true)
    setBackendError(false) // Reset backend error state
    setRetryCount(0) // Reset retry count
    
    // Load initial batch only once
    const loadInitialItems = async () => {
      if (loading) return
      
      setLoading(true)
      try {
        if (useRealData && !backendError && retryCount < 3) {
          // Try real API first
          const response = await fetchShuls(6, 0, buildSearchParams())
          setShuls(response.shuls)
          setHasMore(response.hasMore)
          setRetryCount(0) // Reset retry count on success
        } else {
          // Use mock data (fallback or after max retries)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const mockItems = generateMockShuls(6)
          setShuls(mockItems)
          setHasMore(true)
        }
        setPage(1)
      } catch (error) {
        console.error('Error loading initial items:', error)
        // Increment retry count
        setRetryCount((prev) => prev + 1)
        
        // If we've exceeded retry limit, switch to mock data permanently
        if (retryCount >= 2) {
          console.log('Backend unreachable after 3 attempts, switching to mock data')
          setBackendError(true)
          setRetryCount(0)
        }
        
        // Always fall back to mock data on error
        const mockItems = generateMockShuls(6)
        setShuls(mockItems)
        setHasMore(true)
        setPage(1)
      } finally {
        setLoading(false)
      }
    }
    
    loadInitialItems()
  }, [category, searchQuery, useRealData]) // Remove forceMockData dependency to prevent circular dependency

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

  // Transform real shul data to match our ShulCard interface
  const transformRealShul = useCallback((shul: RealShul) => {
    // Enhanced rating logic with better fallbacks
    const rating = shul.rating || shul.star_rating || shul.google_rating
    const ratingText = rating && typeof rating === 'number' ? rating.toFixed(1) : undefined
    
    // Distance logic — compute from user location if available; fall back to API string
    let distanceText = ''
    if (userLocation && (shul.latitude !== null) && (shul.longitude !== null)) {
      const latNum = typeof shul.latitude === 'number' ? shul.latitude : parseFloat(String(shul.latitude))
      const lngNum = typeof shul.longitude === 'number' ? shul.longitude : parseFloat(String(shul.longitude))
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        const km = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          latNum,
          lngNum
        )
        distanceText = formatDistance(km)
      }
    } else if (shul.distance && typeof shul.distance === 'string' && shul.distance.trim() !== '') {
      distanceText = shul.distance
    }
    
    // Shul type as subtitle - use denomination if shul_type is not available
    const shulType = (shul.shul_type && typeof shul.shul_type === 'string' && shul.shul_type.trim() !== '') 
      ? shul.shul_type 
      : (shul.denomination && typeof shul.denomination === 'string' && shul.denomination.trim() !== '' ? shul.denomination : '')
    
    // Create a meaningful description
    const denomination = shul.denomination && typeof shul.denomination === 'string' ? shul.denomination : 'Jewish'
    const city = shul.city && typeof shul.city === 'string' ? shul.city : 'Florida'
    const description = shul.description && typeof shul.description === 'string' ? shul.description : `${denomination} synagogue in ${city}`
    
    return {
      id: String(shul.id),
      name: shul.name && typeof shul.name === 'string' ? shul.name : 'Unnamed Synagogue',
      denomination: shul.denomination || shul.shul_type || 'Jewish',
      hechsher: shul.kosher_certification ? [shul.kosher_certification] : [],
      neighborhood: shul.city,
      city: shul.city,
      state: shul.state,
      services: shul.tags || [],
      rating: typeof rating === 'number' ? rating : undefined,
      review_count: typeof shul.review_count === 'number' ? shul.review_count : 0,
      distance: distanceText ? parseFloat(distanceText.replace(/[^\d.]/g, '')) : undefined,
      is_open_now: shul.is_active,
      images: shul.image_url ? [{ url: shul.image_url, is_hero: true }] : shul.logo_url ? [{ url: shul.logo_url, is_hero: true }] : [],
      features: shul.tags || [],
      contact: {
        phone: shul.phone_number,
        email: shul.email,
        website: shul.website
      }
    }
  }, [userLocation])

  // Filter shuls based on category and search
  const filteredShuls = shuls.filter(shul => {
    // Category filter
    if (category !== "all") {
      const shulDenomination = useRealData ? (shul as RealShul).denomination : shul.denomination
      if (shulDenomination?.toLowerCase() !== category.toLowerCase()) {
        return false
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const shulName = useRealData ? (shul as RealShul).name : shul.name
      const shulCity = useRealData ? (shul as RealShul).city : shul.city
      const shulState = useRealData ? (shul as RealShul).state : shul.state
      const shulDenomination = useRealData ? (shul as RealShul).denomination : shul.denomination
      const shulTags = useRealData ? (shul as RealShul).tags : shul.services
      
      return (
        shulName?.toLowerCase().includes(query) ||
        shulCity?.toLowerCase().includes(query) ||
        shulState?.toLowerCase().includes(query) ||
        shulDenomination?.toLowerCase().includes(query) ||
        shulTags?.some((tag: string) => tag.toLowerCase().includes(query))
      )
    }

    return true
  })

  // Handle card click
  const handleCardClick = (shul: any) => {
    console.log("Shul clicked:", shul)
    // TODO: Navigate to shul detail page
  }

  if (filteredShuls.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <Search className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No shuls found</h3>
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
                <p>Showing sample data. Real synagogue data will appear when the backend is accessible.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Grid Layout - Exactly matching dynamic-card-ts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredShuls.map((shul, index) => (
          <div key={`shul-${shul.id}-${index}`}>
            <ShulCard
              shul={useRealData ? transformRealShul(shul as RealShul) : shul}
              showDistance={showDistance}
              showRating={showRating}
              showServices={showServices}
              onClick={() => handleCardClick(shul)}
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

      {/* End of Results */}
      {!hasMore && filteredShuls.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">No more items to load</div>
      )}
    </div>
  )
}
