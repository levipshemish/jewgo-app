"use client"
import { useState, useRef } from "react"
import Header from "@/components/layout/Header"
import CategoryTabs from "@/components/navigation/ui/CategoryTabs"
import ActionButtons from "@/components/layout/ActionButtons"
import ShulGrid from "@/components/shuls/ShulGrid"
import ShulBottomNavigation from "@/components/shuls/ShulBottomNavigation"
import { useLocation } from "@/lib/contexts/LocationContext"

export default function ShulsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showDistance, setShowDistance] = useState(true)
  const [showRating, setShowRating] = useState(true)
  const [showServices, setShowServices] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Location context for distance calculations
  const { userLocation } = useLocation()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Sticky at top */}
      <Header 
        onSearch={handleSearch}
        placeholder="Find synagogues near you"
      />

      {/* Navigation Block - Sticky below header */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <CategoryTabs />
        <ActionButtons
          onCreateListing={() => console.log("Create listing")}
          onViewMap={() => console.log("View map")}
          onViewFavorites={() => console.log("View favorites")}
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
        />
      </div>

      {/* Bottom Navigation - Fixed at bottom */}
      <ShulBottomNavigation />
    </div>
  )
}
