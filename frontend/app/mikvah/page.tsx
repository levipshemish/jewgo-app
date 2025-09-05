"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import Header from "@/components/layout/Header"
import CategoryTabs from "@/components/navigation/ui/CategoryTabs"
import ActionButtons from "@/components/layout/ActionButtons"
import ShulBottomNavigation from "@/components/shuls/ShulBottomNavigation"
import { useLocation } from "@/lib/contexts/LocationContext"
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters"
import { AppliedFilters } from "@/lib/filters/filters.types"
import UnifiedCard from "@/components/ui/UnifiedCard"
import { useRouter } from "next/navigation"
import { generateMockMikvah, type MockMikvah } from "@/lib/mockData/mikvah"

// Mikvah type
interface Mikvah {
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

// Real API function for mikvah
const fetchMikvah = async (limit: number, params?: string, timeoutMs: number = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const queryString = params ? `?${params}` : '';
    const response = await fetch(`/api/mikvah${queryString}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      mikvah: data.data || [],
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || limit
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
    throw new Error('Failed to fetch mikvah facilities');
  }
};

export default function MikvahPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showDistance] = useState(true)
  const [showRating] = useState(true)
  const [showServices] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("mikvah")
  const [showFilters, setShowFilters] = useState(false)
  const [mikvah, setMikvah] = useState<Mikvah[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendError, setBackendError] = useState(false) // Track if backend is accessible
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  
  // Location context for distance calculations
  const {
    userLocation,
    isLoading: locationLoading,
    requestLocation,
  } = useLocation()

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
  }, [searchQuery, activeFilters])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleShowFilters = useCallback(() => {
    setShowFilters(true)
  }, [])

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false)
  }, [])

  const handleApplyFilters = useCallback((filters: AppliedFilters) => {
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

  // Transform mikvah data for UnifiedCard
  const transformMikvahToCardData = (mikvahFacility: Mikvah) => {
    const rating = mikvahFacility.rating || mikvahFacility.star_rating || mikvahFacility.google_rating;
    const ratingText = rating ? rating.toFixed(1) : undefined;
    const distanceText = mikvahFacility.distance && mikvahFacility.distance.trim() !== '' ? mikvahFacility.distance : '';
    const mikvahType = mikvahFacility.mikvah_type && mikvahFacility.mikvah_type.trim() !== '' ? mikvahFacility.mikvah_type : '';
    
    return {
      id: String(mikvahFacility.id),
      imageUrl: mikvahFacility.image_url,
      imageTag: mikvahFacility.kosher_certification,
      title: mikvahFacility.name,
      badge: ratingText,
      subtitle: mikvahType,
      additionalText: distanceText,
      showHeart: true,
      isLiked: false,
      kosherCategory: mikvahFacility.kosher_certification,
      rating,
      reviewCount: mikvahFacility.reviewcount,
      city: mikvahFacility.city,
      distance: mikvahFacility.distance,
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
            {mikvah.map((mikvahFacility, index) => (
              <div key={`mikvah-${mikvahFacility.id}-${index}`}>
                <UnifiedCard
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

        {mikvah.length === 0 && !loading && (
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
    </div>
  )
}