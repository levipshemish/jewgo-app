"use client"

import { MapPin, Zap, ChevronDown, MessageCircle, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"

import { BottomNavigation } from "@/components/core"
import { CategoryTabs } from "@/components/core"
import { MarketplaceAPI } from "@/lib/api/marketplace"
import type {
  MarketplaceListing,
  MarketplaceCategory as _MarketplaceCategory,
  MarketplaceFilters as MarketplaceFiltersType,
  MarketplaceStats as _MarketplaceStats,
} from "@/lib/types/marketplace"

import { Grid } from "@/components/core"

import MarketplaceHeader from "./MarketplaceHeader"
import CategoryFilter from "./CategoryFilter"
import EnhancedFilters from "./EnhancedFilters"

// Marketplace-specific action buttons using eatery design style
function MarketplaceActionButtons({
  onCategoryFilterOpen,
  onEnhancedFiltersOpen,
  activeFilters,
}: {
  onCategoryFilterOpen: () => void
  onEnhancedFiltersOpen: () => void
  activeFilters: MarketplaceFiltersType
}) {
  const router = useRouter()
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768

  const handleSellClick = () => {
    router.push("/marketplace/sell")
  }

  const handleCategoryClick = () => {
    onCategoryFilterOpen()
  }

  const handleEnhancedFiltersClick = () => {
    onEnhancedFiltersOpen()
  }

  const handleMessagesClick = () => {
    router.push("/marketplace/messages")
  }

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter((value) => value !== "").length
  }

  return (
    <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
      <div className="max-w-screen-sm sm:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between space-x-2 sm:space-x-3 lg:space-x-6">
          {/* Sell Button */}
          <button
            type="button"
            onClick={handleSellClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: "44px",
              minWidth: "44px",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              cursor: "pointer",
              ...(isMobile && {
                transition: "all 0.1s ease-out",
              }),
            }}
          >
            <Zap className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Sell</span>
          </button>

          {/* Category Filter Button */}
          <button
            type="button"
            onClick={handleCategoryClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: "44px",
              minWidth: "44px",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              cursor: "pointer",
              ...(isMobile && {
                transition: "all 0.1s ease-out",
              }),
            }}
          >
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              Category
              {activeFilters.category && (
                <span className="ml-1 bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-full">1</span>
              )}
            </span>
            <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          </button>

          {/* Enhanced Filters Button */}
          <button
            type="button"
            onClick={handleEnhancedFiltersClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: "44px",
              minWidth: "44px",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              cursor: "pointer",
              ...(isMobile && {
                transition: "all 0.1s ease-out",
              }),
            }}
          >
            <Filter className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              Filters
              {getActiveFilterCount() > 0 && (
                <span className="ml-1 bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-full">
                  {getActiveFilterCount()}
                </span>
              )}
            </span>
          </button>

          {/* Messages Button */}
          <button
            type="button"
            onClick={handleMessagesClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: "44px",
              minWidth: "44px",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              cursor: "pointer",
              ...(isMobile && {
                transition: "all 0.1s ease-out",
              }),
            }}
          >
            <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Messages</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Location display component
function LocationDisplay() {
  return (
    <div className="flex items-center gap-1 text-sm text-gray-500">
      <MapPin className="w-4 h-4" />
      <span>Miami Gardens, FL</span>
    </div>
  )
}



export default function MarketplacePageClient() {
  const [_products, setProducts] = useState<MarketplaceListing[]>([])
  const [searchQuery, _setSearchQuery] = useState("")
  const [filters, setFilters] = useState<MarketplaceFiltersType>({
    category: "",
    subcategory: "",
    kind: "",
    condition: "",
    minPrice: "",
    maxPrice: "",
    city: "",
    region: "",
  })
  const [loading, setLoading] = useState(true)

  const [_wishlist, setWishlist] = useState<MarketplaceListing[]>([])

  // Filter modal states
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [showEnhancedFilters, setShowEnhancedFilters] = useState(false)

  useEffect(() => {
    loadMarketplaceData()
  }, [])

  const loadFilteredProducts = useCallback(async () => {
    try {
      const filteredProducts = await MarketplaceAPI.getProducts(filters)
      setProducts(filteredProducts)
    } catch (error) {
      console.error("Failed to load filtered products:", error)
    }
  }, [filters])

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      loadFilteredProducts()
    }
  }, [filters, loadFilteredProducts])

  const loadMarketplaceData = async () => {
    try {
      setLoading(true)
      const productsData = await MarketplaceAPI.getProducts()
      setProducts(productsData)
    } catch (error) {
      console.error("Failed to load marketplace data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMarketplaceData()
      return
    }

    try {
      const searchResults = await MarketplaceAPI.search(searchQuery, filters)
      setProducts(searchResults.products)
    } catch (error) {
      console.error("Search failed:", error)
    }
  }





  const _handleAddToWishlist = (product: MarketplaceListing) => {
    setWishlist((prev) => {
      const exists = prev.find((p) => p.id === product.id)
      if (exists) {
        return prev.filter((p) => p.id !== product.id)
      }
      return [...prev, product]
    })
  }

  // Filter handlers
  const handleCategoryChange = (category: string, subcategory?: string) => {
    setFilters((prev) => ({
      ...prev,
      category,
      subcategory: subcategory || "",
    }))
  }

  const handleEnhancedFiltersChange = (newFilters: MarketplaceFiltersType) => {
    setFilters(newFilters)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MarketplaceHeader onSearch={handleSearch} />
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="marketplace" />
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-20 sm:pb-24 md:pb-28 lg:pb-28 xl:pb-32 2xl:pb-36">
          <div className="max-w-7xl mx-auto space-y-4">
            <MarketplaceActionButtons
              onCategoryFilterOpen={() => setShowCategoryFilter(true)}
              onEnhancedFiltersOpen={() => setShowEnhancedFilters(true)}
              activeFilters={filters}
            />
            <LocationDisplay />
            <Grid
              category="all"
              searchQuery=""
              showDistance={true}
              showRating={true}
              showServices={true}
              scrollContainerRef={{ current: null }}
              userLocation={null}
              useRealData={false}
              activeFilters={{}}
              dataType="marketplace"
            />
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MarketplaceHeader onSearch={handleSearch} />
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab="marketplace" />
      </div>
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-20 sm:pb-24 md:pb-28 lg:pb-28 xl:pb-32 2xl:pb-36">
        <div className="max-w-7xl mx-auto space-y-4">
          <MarketplaceActionButtons
            onCategoryFilterOpen={() => setShowCategoryFilter(true)}
            onEnhancedFiltersOpen={() => setShowEnhancedFilters(true)}
            activeFilters={filters}
          />
          <LocationDisplay />
          <Grid
            category="all"
            searchQuery=""
            showDistance={true}
            showRating={true}
            showServices={true}
            scrollContainerRef={{ current: null }}
            userLocation={null}
            useRealData={false}
            activeFilters={{}}
            dataType="marketplace"
          />
        </div>

        {/* Filter Modals */}
        <CategoryFilter
          selectedCategory={filters.category}
          selectedSubcategory={filters.subcategory}
          onCategoryChange={handleCategoryChange}
          onClose={() => setShowCategoryFilter(false)}
          isOpen={showCategoryFilter}
        />

        <EnhancedFilters
          filters={filters}
          onFiltersChange={handleEnhancedFiltersChange}
          onClose={() => setShowEnhancedFilters(false)}
          isOpen={showEnhancedFilters}
        />
      </div>
      <BottomNavigation />
    </div>
  )
}
