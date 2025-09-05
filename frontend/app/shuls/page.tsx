"use client"
import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import Header from "@/components/layout/Header"
import CategoryTabs from "@/components/navigation/ui/CategoryTabs"
import ActionButtons from "@/components/layout/ActionButtons"
import ShulGrid from "@/components/shuls/ShulGrid"
import ShulBottomNavigation from "@/components/shuls/ShulBottomNavigation"
import { useLocation } from "@/lib/contexts/LocationContext"

export default function ShulsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showDistance] = useState(true)
  const [showRating] = useState(true)
  const [showServices] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("shuls")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  
  // Location context for distance calculations
  const { userLocation } = useLocation()

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
          onShowFilters={() => console.log("Show filters")}
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
        />
      </div>

      {/* Bottom Navigation - Fixed at bottom */}
      <ShulBottomNavigation />
    </div>
  )
}
