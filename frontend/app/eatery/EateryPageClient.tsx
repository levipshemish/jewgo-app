"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import Header from "@/components/layout/Header"
import { CategoryTabs } from "@/components/core"
import ActionButtons from "@/components/layout/ActionButtons"
import EateryGrid from "./components/EateryGrid"
import ShulBottomNavigation from "@/components/shuls/ShulBottomNavigation"
import EateryFilterModal from "./components/EateryFilterModal"
import { useLocationData } from "@/hooks/useLocationData"
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters"
import { AppliedFilters } from "@/lib/filters/filters.types"
import type { LightRestaurant } from "./types"
import LocationAwarePage from "@/components/LocationAwarePage"
import { ActiveFilterChips } from "@/components/filters/ActiveFilterChips"

function EateryPageContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showDistance] = useState(true)
  const [showRating] = useState(true)
  const [showServices] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("eatery")
  const [showFilters, setShowFilters] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  
  // Use the new location data hook
  const {
    userLocation,
    isLoading: locationLoading,
    requestLocation,
    permissionStatus: _permissionStatus,
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

  // State for filter options from restaurants API
  const [filterOptions, setFilterOptions] = useState<any>(null)
  
  // Debug: Log when filterOptions changes
  useEffect(() => {
    console.log('EateryPageClient filterOptions changed:', filterOptions);
  }, [filterOptions]);

  // Load filter options when component mounts
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await fetch('/api/restaurants/filter-options');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setFilterOptions(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname.startsWith('/eatery')) {
      setActiveTab('eatery')
    }
  }, [pathname])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    // Additional logic can be added here if needed
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

  const handleRemoveFilter = useCallback((filterKey: string) => {
    clearFilter(filterKey as keyof typeof activeFilters)
  }, [clearFilter])

  const handleCardClick = useCallback((restaurant: LightRestaurant) => {
    router.push(`/eatery/${restaurant.id}`)
  }, [router])

  const handleShowMap = useCallback(() => {
    router.push('/live-map')
  }, [router])

  const handleAddEatery = useCallback(() => {
    // TODO: Implement add eatery functionality
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Sticky at top */}
      <Header 
        onSearch={handleSearch}
        placeholder="Find restaurants near you"
      />

      {/* Navigation Block - Sticky below header */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <CategoryTabs 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <ActionButtons
          onShowFilters={handleShowFilters}
          onShowMap={handleShowMap}
          onAddEatery={handleAddEatery}
          addButtonText="Add Restaurant"
        />
        
        {/* Active Filter Chips */}
        <div className="px-4 py-2 border-b border-border/30">
          <ActiveFilterChips
            filters={activeFilters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={clearAllFilters}
            variant="full"
            className="min-h-[32px]"
          />
        </div>
      </div>

      {/* Grid - Fill remaining space and account for bottom nav height via CSS var */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--bottom-nav-height, 64px))' }}
      >
        <EateryGrid
          category="all"
          searchQuery={searchQuery}
          showDistance={showDistance}
          showRating={showRating}
          showServices={showServices}
          scrollContainerRef={scrollContainerRef}
          userLocation={userLocation}
          useRealData={true}
          activeFilters={activeFilters}
          onCardClick={handleCardClick}
          onFilterOptionsReceived={setFilterOptions}
        />
      </div>

      {/* Bottom Navigation - Fixed at bottom */}
      <ShulBottomNavigation />

      {/* Filter Modal */}
      <EateryFilterModal
        isOpen={showFilters}
        onClose={handleCloseFilters}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        userLocation={userLocation}
        locationLoading={locationLoading}
        onRequestLocation={requestLocation}
        preloadedFilterOptions={filterOptions}
      />

    </div>
  )
}

export default function EateryPageClient() {
  return (
    <LocationAwarePage showLocationPrompt={true}>
      <EateryPageContent />
    </LocationAwarePage>
  )
}