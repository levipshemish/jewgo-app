"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import Header from "@/components/layout/Header"
import { CategoryTabs } from "@/components/core"
import ActionButtons from "@/components/layout/ActionButtons"
import ShulBottomNavigation from "@/components/shuls/ShulBottomNavigation"
import { useLocationData } from "@/hooks/useLocationData"
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters"
import { AppliedFilters } from "@/lib/filters/filters.types"
import Card from "@/components/core/cards/Card"
import { useRouter } from "next/navigation"
import { generateMockMikvah, type MockMikvah } from "@/lib/mockData/mikvah"
import LocationAwarePage from "@/components/LocationAwarePage"
import { ModernFilterPopup } from "@/components/filters/ModernFilterPopup"
import { transformMikvahToGridCard, type RealMikvah } from "@/lib/types/mikvah"

// Mikvah type
interface _Mikvah {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone_number?: string;
  website?: string;
  email?: string;
  mikvah_type?: string;
  mikvah_category?: string;
  business_hours?: string;
  requires_appointment?: boolean;
  appointment_phone?: string;
  appointment_website?: string;
  walk_in_available?: boolean;
  advance_booking_days?: number;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  reviewcount?: number;
  star_rating?: number;
  google_rating?: number;
  image_url?: string;
  logo_url?: string;
  has_changing_rooms?: boolean;
  has_shower_facilities?: boolean;
  has_towels_provided?: boolean;
  has_soap_provided?: boolean;
  has_hair_dryers?: boolean;
  has_private_entrance?: boolean;
  has_disabled_access?: boolean;
  has_parking?: boolean;
  rabbinical_supervision?: string;
  kosher_certification?: string;
  community_affiliation?: string;
  religious_authority?: string;
  fee_amount?: number;
  fee_currency?: string;
  accepts_credit_cards?: boolean;
  accepts_cash?: boolean;
  accepts_checks?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
}

// Real API function for mikvah using v5 API
const fetchMikvah = async (limit: number, params?: string, timeoutMs: number = 5000) => {
  try {
    const queryString = params ? `?${params}` : '';
    const url = `/api/v5/mikvahs${queryString}`;
    
    // Use unified API call with caching and deduplication
    const { unifiedApiCall } = await import('@/lib/utils/unified-api');
    const result = await unifiedApiCall(url, {
      ttl: 5 * 60 * 1000, // 5 minutes cache (mikvah data changes infrequently)
      deduplicate: true,
      retry: true,
      retryAttempts: 2,
      timeout: timeoutMs,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch mikvah data');
    }

    const data = result.data;
    return {
      mikvah: data.data || data.mikvahs || [],
      total: data.total_count || data.total || 0,
      page: data.page || 1,
      limit: data.limit || limit,
      cached: result.cached || false,
      performance: result.performance
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
    throw new Error('Failed to fetch mikvah facilities');
  }
};

function MikvahPageContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [_showDistance] = useState(true)
  const [_showRating] = useState(true)
  const [_showServices] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("mikvah")
  const [_showFilters, setShowFilters] = useState(false)
  const [mikvah, setMikvah] = useState<MockMikvah[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendError, setBackendError] = useState(false) // Track if backend is accessible
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  
  // Use the new location data hook
  const {
    userLocation,
    isLoading: locationLoading,
    requestLocation,
    getItemDisplayText: _getItemDisplayText
  } = useLocationData({
    fallbackText: 'Get Location'
  })

  // Advanced filters hook
  const {
    activeFilters,
    setFilter,
    clearFilter,
    clearAllFilters
  } = useAdvancedFilters()

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname.startsWith('/mikvah')) {
      setActiveTab('mikvah')
    }
  }, [pathname])

  // Fetch mikvah data
  useEffect(() => {
    const loadMikvah = async () => {
      try {
        setLoading(true)
        setError(null)
        setBackendError(false)
        
        const params = new URLSearchParams()
        if (searchQuery && searchQuery.trim() !== '') {
          params.append('search', searchQuery.trim())
        }
        
        // Add filter parameters
        Object.entries(activeFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value))
          }
        })
        
        // Note: Distance sorting is now handled client-side for reliability
        
        params.append('limit', '50')
        
        const response = await fetchMikvah(50, params.toString())
        setMikvah(response.mikvah)
      } catch (err) {
        console.error('Error fetching mikvah:', err)
        
        // Switch to mock data after error
        console.log('Backend unreachable, switching to mock data')
        setBackendError(true)
        setError(null) // Clear error since we're showing mock data
        
        // Fall back to mock data
        const mockMikvahs = generateMockMikvah(24)
        setMikvah(mockMikvahs)
      } finally {
        setLoading(false)
      }
    }
    
    loadMikvah()
  }, [searchQuery, activeFilters, userLocation?.latitude, userLocation?.longitude])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleShowFilters = useCallback(() => {
    setShowFilters(true)
  }, [])

  const _handleCloseFilters = useCallback(() => {
    setShowFilters(false)
  }, [])

  const _handleApplyFilters = useCallback((filters: AppliedFilters) => {
    if (Object.keys(filters).length === 0) {
      clearAllFilters()
    } else {
      const cleaned: Partial<typeof filters> = {}
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && 
            !(typeof v === "string" && v.trim() === "") &&
            !(Array.isArray(v) && v.length === 0)) {
          cleaned[k as keyof typeof filters] = v
        }
      })
      
      // Batch filter updates to reduce re-renders
      const keysToRemove = Object.keys(activeFilters).filter(k => !(k in cleaned))
      keysToRemove.forEach(k => {
        clearFilter(k as keyof typeof activeFilters)
      })
      
      Object.entries(cleaned).forEach(([key, value]) => {
        if (value !== undefined) {
          setFilter(key as keyof typeof activeFilters, value)
        }
      })
    }
    
    setShowFilters(false)
  }, [setFilter, clearFilter, clearAllFilters, activeFilters])

  // Transform mikvah data using the new specialized MikvahGridCard type
  const transformMikvahToCardData = (mikvahFacility: MockMikvah | RealMikvah) => {
    // Convert to RealMikvah format for the transformer (handles both mock and real data)
    const realMikvah: RealMikvah = {
      id: mikvahFacility.id,
      name: mikvahFacility.name,
      description: mikvahFacility.description,
      address: mikvahFacility.address,
      city: mikvahFacility.city,
      state: mikvahFacility.state,
      zip_code: mikvahFacility.zip_code,
      phone_number: mikvahFacility.phone_number,
      website: mikvahFacility.website,
      email: mikvahFacility.email,
      mikvah_type: mikvahFacility.mikvah_type,
      mikvah_category: mikvahFacility.mikvah_category,
      business_hours: mikvahFacility.business_hours,
      requires_appointment: mikvahFacility.requires_appointment,
      appointment_phone: mikvahFacility.appointment_phone,
      appointment_website: mikvahFacility.appointment_website,
      walk_in_available: mikvahFacility.walk_in_available,
      advance_booking_days: mikvahFacility.advance_booking_days,
      distance: mikvahFacility.distance,
      distance_miles: mikvahFacility.distance_miles,
      rating: mikvahFacility.rating,
      review_count: mikvahFacility.review_count,
      star_rating: mikvahFacility.star_rating,
      google_rating: mikvahFacility.google_rating,
      image_url: mikvahFacility.image_url,
      logo_url: mikvahFacility.logo_url,
      has_changing_rooms: mikvahFacility.has_changing_rooms,
      has_shower_facilities: mikvahFacility.has_shower_facilities,
      has_towels_provided: mikvahFacility.has_towels_provided,
      has_soap_provided: mikvahFacility.has_soap_provided,
      has_hair_dryers: mikvahFacility.has_hair_dryers,
      has_private_entrance: mikvahFacility.has_private_entrance,
      has_disabled_access: mikvahFacility.has_disabled_access,
      has_parking: mikvahFacility.has_parking,
      rabbinical_supervision: mikvahFacility.rabbinical_supervision,
      kosher_certification: mikvahFacility.kosher_certification,
      community_affiliation: mikvahFacility.community_affiliation,
      religious_authority: mikvahFacility.religious_authority,
      fee_amount: mikvahFacility.fee_amount,
      fee_currency: mikvahFacility.fee_currency,
      accepts_credit_cards: mikvahFacility.accepts_credit_cards,
      accepts_cash: mikvahFacility.accepts_cash,
      accepts_checks: mikvahFacility.accepts_checks,
      is_active: mikvahFacility.is_active,
      is_verified: mikvahFacility.is_verified,
      created_at: mikvahFacility.created_at,
      updated_at: mikvahFacility.updated_at,
      tags: mikvahFacility.tags,
      admin_notes: mikvahFacility.admin_notes,
      specials: mikvahFacility.specials,
      listing_type: mikvahFacility.listing_type,
      latitude: mikvahFacility.latitude,
      longitude: mikvahFacility.longitude
    };

    // Use the specialized transformer
    const mikvahGridCard = transformMikvahToGridCard(realMikvah, userLocation);
    
    // Convert to Card component format
    return {
      id: String(realMikvah.id),
      imageUrl: mikvahGridCard.imageUrl,
      imageTag: mikvahGridCard.imageTag,
      title: mikvahGridCard.title,
      badge: mikvahGridCard.badge ? `${mikvahGridCard.badge.rating.toFixed(1)}` : undefined,
      subtitle: mikvahGridCard.subtitle,
      additionalText: mikvahGridCard.additionalText,
      showHeart: mikvahGridCard.showHeart,
      isLiked: mikvahGridCard.isLiked,
      kosherCategory: mikvahGridCard.mikvahCategory,
      rating: mikvahGridCard.badge?.rating,
      reviewCount: mikvahGridCard.badge?.reviewCount,
      city: mikvahGridCard.city,
      distance: mikvahGridCard.additionalText,
    };
  };

  // Only show error if we're not using mock data
  if (error && !backendError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header 
          onSearch={handleSearch}
          placeholder="Find mikvah facilities near you"
        />
        
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
          <CategoryTabs activeTab="mikvah" />
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#4ade80] text-white rounded-lg hover:bg-[#22c55e] transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Sticky at top */}
      <Header 
        onSearch={handleSearch}
        placeholder="Find mikvah facilities near you"
      />

      {/* Navigation Block - Sticky below header */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <CategoryTabs 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <ActionButtons
          onShowFilters={handleShowFilters}
          onShowMap={() => console.log("View map")}
          onAddEatery={() => console.log("Create listing")}
          addButtonText="Add Mikvah"
        />
      </div>

      {/* Grid - Explicit height constraint to prevent overflow */}
      <div 
        ref={scrollContainerRef}
        className="overflow-y-auto pb-4"
        style={{ 
          height: 'calc(100vh - 64px - 64px - 64px - 160px)', // header - nav - bottom nav - extra space for search bar
          maxHeight: 'calc(100vh - 64px - 64px - 64px - 160px)'
        }}
      >
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
                    <p>Showing sample data. Real mikvah data will appear when the backend is accessible.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Grid Layout - Exactly matching EateryGrid and ShulGrid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.isArray(mikvah) && mikvah.map((mikvahFacility, index) => (
              <div key={`mikvah-${mikvahFacility.id}-${index}`}>
                <Card
                  data={transformMikvahToCardData(mikvahFacility)}
                  variant="default"
                  showStarInBadge={true}
                  priority={index < 4}
                  onCardClick={() => router.push(`/mikvah/${mikvahFacility.id}`)}
                  className="w-full h-full"
                />
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="text-center py-5">
            <p>Loading mikvah facilities...</p>
          </div>
        )}

        {Array.isArray(mikvah) && mikvah.length === 0 && !loading && (
          <div className="text-center py-10 px-5">
            <div className="text-5xl mb-4">🛁</div>
            <p className="text-lg text-gray-600 mb-2">No mikvah facilities found</p>
            <p className="text-sm text-gray-500">
              Try adjusting your filters or check back later
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Fixed at bottom */}
      <ShulBottomNavigation />

      {/* Filters Modal */}
              <ModernFilterPopup
                isOpen={_showFilters}
                onClose={_handleCloseFilters}
                onApplyFilters={_handleApplyFilters}
                initialFilters={activeFilters}
                userLocation={userLocation}
                locationLoading={locationLoading}
                onRequestLocation={requestLocation}
                entityType="mikvahs"
              />
    </div>
  )
}

export default function MikvahPage() {
  return (
    <LocationAwarePage showLocationPrompt={true}>
      <MikvahPageContent />
    </LocationAwarePage>
  )
}