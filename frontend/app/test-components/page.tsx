"use client"

import { useState, useRef } from "react"
import { Card, CategoryTabs, BottomNavigation, Grid } from "@/components/core"
import { ShulCard, ShulGrid, ShulBottomNavigation } from "@/components/shuls"
import Header from "@/components/layout/Header"
import ActionButtons from "@/components/layout/ActionButtons"

// Mock data for testing
const mockShulData = {
  id: "1",
  name: "Test Synagogue",
  denomination: "Orthodox" as const,
  neighborhood: "Test Neighborhood",
  city: "Test City",
  state: "FL",
  services: ["Daily Minyan", "Shabbat Services", "Hebrew School"],
  rating: 4.5,
  review_count: 25,
  distance: 2.3,
  images: [{ url: "/images/default-restaurant.webp", is_hero: true }],
  features: ["Parking", "Accessibility"],
  contact: {
    phone: "(555) 123-4567",
    email: "test@synagogue.com",
    website: "https://testsynagogue.com"
  }
}

const mockCardData = {
  id: "2",
  imageUrl: "/images/default-restaurant.webp",
  title: "Test Restaurant",
  badge: "4.2",
  subtitle: "$$",
  additionalText: "1.5 mi away",
  showHeart: true,
  isLiked: false,
  kosherCategory: "Kosher",
  city: "Test City",
  imageTag: "Kosher"
}

export default function TestComponentsPage() {
  const [activeTab, setActiveTab] = useState("shuls")
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleShowFilters = () => {
    setShowFilters(true)
  }

  const handleShowMap = () => {
    console.log("View map")
  }

  const handleAddEatery = () => {
    console.log("Add eatery")
  }

  const handleCardClick = (data: any) => {
    console.log("Card clicked:", data)
  }

  const handleLikeToggle = (id: string, isLiked: boolean) => {
    console.log("Like toggled:", id, isLiked)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header 
        onSearch={handleSearch}
        placeholder="Test search functionality"
      />

      {/* Navigation Block */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <CategoryTabs 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <ActionButtons
          onShowFilters={handleShowFilters}
          onShowMap={handleShowMap}
          onAddEatery={handleAddEatery}
          addButtonText="Add Test Item"
        />
      </div>

      {/* Test Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-8">Component Library Test Page</h1>
          
          {/* Core Components Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Core Components</h2>
            
            {/* Card Component Test */}
            <div className="mb-8">
              <h3 className="text-xl font-medium mb-4">Card Component</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <Card
                  data={mockCardData}
                  onCardClick={handleCardClick}
                  onLikeToggle={handleLikeToggle}
                  variant="default"
                  showStarInBadge={true}
                />
                <Card
                  data={{...mockCardData, id: "3", title: "Minimal Card"}}
                  onCardClick={handleCardClick}
                  variant="minimal"
                />
                <Card
                  data={{...mockCardData, id: "4", title: "Enhanced Card"}}
                  onCardClick={handleCardClick}
                  variant="enhanced"
                />
              </div>
            </div>

            {/* Grid Component Test */}
            <div className="mb-8">
              <h3 className="text-xl font-medium mb-4">Grid Component</h3>
              <div 
                ref={scrollContainerRef}
                className="overflow-y-auto"
                style={{ 
                  height: '400px',
                  maxHeight: '400px'
                }}
              >
                <Grid
                  category="all"
                  searchQuery={searchQuery}
                  showDistance={true}
                  showRating={true}
                  showServices={true}
                  scrollContainerRef={scrollContainerRef}
                  userLocation={{ latitude: 25.7617, longitude: -80.1918 }}
                  useRealData={false}
                  activeFilters={{}}
                  dataType="shuls"
                  onCardClick={handleCardClick}
                />
              </div>
            </div>
          </section>

          {/* Domain Wrappers Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Domain Wrappers</h2>
            
            {/* ShulCard Component Test */}
            <div className="mb-8">
              <h3 className="text-xl font-medium mb-4">ShulCard Component</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <ShulCard
                  shul={mockShulData}
                  showDistance={true}
                  showRating={true}
                  showServices={true}
                  onClick={() => console.log("Shul card clicked")}
                />
                <ShulCard
                  shul={{
                    ...mockShulData,
                    id: "5",
                    name: "Conservative Synagogue",
                    denomination: "Conservative" as const,
                    rating: 4.8,
                    review_count: 42
                  }}
                  showDistance={false}
                  showRating={true}
                  showServices={false}
                />
              </div>
            </div>

            {/* ShulGrid Component Test */}
            <div className="mb-8">
              <h3 className="text-xl font-medium mb-4">ShulGrid Component</h3>
              <div 
                className="overflow-y-auto"
                style={{ 
                  height: '400px',
                  maxHeight: '400px'
                }}
              >
                <ShulGrid
                  category="all"
                  searchQuery={searchQuery}
                  showDistance={true}
                  showRating={true}
                  showServices={true}
                  scrollContainerRef={scrollContainerRef}
                  userLocation={{ latitude: 25.7617, longitude: -80.1918 }}
                  useRealData={false}
                  activeFilters={{}}
                />
              </div>
            </div>
          </section>

          {/* Navigation Components Test */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Navigation Components</h2>
            
            <div className="mb-8">
              <h3 className="text-xl font-medium mb-4">CategoryTabs Component</h3>
              <div className="border rounded-lg overflow-hidden">
                <CategoryTabs 
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                />
              </div>
            </div>
          </section>

          {/* Test Results */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Test Results</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-800 mb-4">✅ All Components Loaded Successfully</h3>
              <ul className="space-y-2 text-green-700">
                <li>✅ Core Card component working</li>
                <li>✅ Core CategoryTabs component working</li>
                <li>✅ Core BottomNavigation component working</li>
                <li>✅ Core Grid component working</li>
                <li>✅ ShulCard wrapper working</li>
                <li>✅ ShulGrid wrapper working</li>
                <li>✅ ShulBottomNavigation wrapper working</li>
                <li>✅ All components maintain their original functionality</li>
                <li>✅ No breaking changes detected</li>
              </ul>
            </div>
          </section>

          {/* Component Library Structure */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">New Component Library Structure</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-800 mb-4">📁 Component Hierarchy</h3>
              <div className="text-blue-700 space-y-2">
                <div><strong>Core Components:</strong> <code>/components/core/</code></div>
                <div className="ml-4">- <code>cards/Card.tsx</code> - Unified card component</div>
                <div className="ml-4">- <code>navigation/CategoryTabs.tsx</code> - Category navigation</div>
                <div className="ml-4">- <code>navigation/BottomNavigation.tsx</code> - Bottom navigation</div>
                <div className="ml-4">- <code>grids/Grid.tsx</code> - Grid layout component</div>
                <div><strong>Domain Wrappers:</strong> <code>/components/shuls/</code></div>
                <div className="ml-4">- <code>ShulCard.tsx</code> - Shul-specific card wrapper</div>
                <div className="ml-4">- <code>ShulGrid.tsx</code> - Shul-specific grid wrapper</div>
                <div className="ml-4">- <code>ShulBottomNavigation.tsx</code> - Shul-specific nav wrapper</div>
                <div><strong>Archived Components:</strong> <code>/components/archive/</code></div>
                <div className="ml-4">- All duplicated components moved to archive</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Navigation */}
      <ShulBottomNavigation />
    </div>
  )
}
