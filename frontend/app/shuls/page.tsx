"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import Header from "@/components/layout/Header"
import { CategoryTabs } from "@/components/core"
import ActionButtons from "@/components/layout/ActionButtons"
import ShulGrid from "@/components/shuls/ShulGrid"
import ShulBottomNavigation from "@/components/shuls/ShulBottomNavigation"
import { ModernFilterPopup } from "@/components/filters/ModernFilterPopup"
import { useLocation } from "@/lib/contexts/LocationContext"
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters"
import { AppliedFilters } from "@/lib/filters/filters.types"

export default function ShulsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showDistance] = useState(true)
  const [showRating] = useState(true)
  const [showServices] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("shuls")
  const [showFilters, setShowFilters] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  
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
    if (pathname.startsWith('/shuls')) {
      setActiveTab('shuls')
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Sticky at top */}
      <Header 
        onSearch={handleSearch}
        placeholder="Find synagogues near you"
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
          addButtonText="Add Shul"
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
        <ShulGrid
          category="all"
          searchQuery={searchQuery}
          showDistance={showDistance}
          showRating={showRating}
          showServices={showServices}
          scrollContainerRef={scrollContainerRef}
          userLocation={userLocation}
          useRealData={true}
          activeFilters={activeFilters}
        />
      </div>

      {/* Bottom Navigation - Fixed at bottom */}
      <ShulBottomNavigation />

      {/* Filter Modal */}
      <ModernFilterPopup
        isOpen={showFilters}
        onClose={handleCloseFilters}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        userLocation={userLocation}
        locationLoading={locationLoading}
        onRequestLocation={requestLocation}
      />
    </div>
  )
}
