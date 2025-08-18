"use client"

import type React from "react"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { ArrowLeft, Filter, SortAsc, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "@/components/product-card"
import { SearchFiltersComponent } from "@/components/search-filters"
import { Badge } from "@/components/ui/badge"
import { useLocation } from "@/hooks/use-location"

// Mock products data - in real app this would come from API
const allProducts = [
  {
    id: 1,
    title: "2004 Toyota Sienna - Great Family Car",
    price: "$2,400",
    originalPrice: "$3,100",
    image: "/silver-minivan-beach.png",
    isFree: false,
    location: "Miami Gardens, FL",
    timeAgo: "2 hours ago",
    category: "Vehicles",
    condition: "Good",
    views: 45,
    seller: { name: "David M.", rating: 4.8, avatar: "/placeholder.svg" },
  },
  {
    id: 2,
    title: "Box of Small LEGO Pieces - Perfect for Kids",
    price: "Free",
    image: "/placeholder-cm5o8.png",
    isFree: true,
    location: "Aventura, FL",
    timeAgo: "4 hours ago",
    category: "Toys",
    condition: "Like New",
    views: 23,
    seller: { name: "Sarah K.", rating: 4.9, avatar: "/placeholder.svg" },
  },
  {
    id: 3,
    title: "Kosher Fleishig Oven - Built-in Model",
    price: "Free",
    image: "/built-in-kitchen-oven.png",
    isFree: true,
    location: "North Miami Beach, FL",
    timeAgo: "6 hours ago",
    category: "Appliances",
    condition: "Fair",
    views: 67,
    seller: { name: "Rachel G.", rating: 4.7, avatar: "/placeholder.svg" },
  },
  {
    id: 4,
    title: "Modern Couches & Chairs Set",
    price: "$100",
    image: "/modern-living-room.png",
    isFree: false,
    location: "Hallandale Beach, FL",
    timeAgo: "8 hours ago",
    category: "Furniture",
    condition: "Good",
    views: 89,
    seller: { name: "Michael L.", rating: 4.6, avatar: "/placeholder.svg" },
  },
  {
    id: 5,
    title: "Mountain Bike - Trek Model",
    price: "$150",
    image: "/black-mountain-bike-forest.png",
    isFree: false,
    location: "Sunny Isles Beach, FL",
    timeAgo: "12 hours ago",
    category: "Sports",
    condition: "Excellent",
    views: 34,
    seller: { name: "Josh R.", rating: 4.9, avatar: "/placeholder.svg" },
  },
  {
    id: 6,
    title: "Storage Unit Organization System",
    price: "$50",
    image: "/organized-storage-shelves.png",
    isFree: false,
    location: "Miami Gardens, FL",
    timeAgo: "1 day ago",
    category: "Home & Garden",
    condition: "Like New",
    views: 56,
    seller: { name: "Lisa C.", rating: 4.8, avatar: "/placeholder.svg" },
  },
]

interface ProductFilters {
  category: string
  priceRange: [number, number]
  condition: string
  location: string
  sortBy: string
  distance: number
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const { currentLocation, calculateDistance } = useLocation()
  const [filters, setFilters] = useState<ProductFilters>({
    category: "",
    priceRange: [0, 10000],
    condition: "",
    location: "",
    sortBy: "newest",
    distance: 25,
  })

  const [filteredProducts, setFilteredProducts] = useState(allProducts)

  useEffect(() => {
    let results = allProducts

    // Filter by search query
    if (searchQuery) {
      results = results.filter(
        (product) =>
          product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by category
    if (filters.category) {
      results = results.filter((product) => product.category === filters.category)
    }

    // Filter by condition
    if (filters.condition) {
      results = results.filter((product) => product.condition === filters.condition)
    }

    // Filter by location
    if (filters.location) {
      results = results.filter((product) => product.location.toLowerCase().includes(filters.location.toLowerCase()))
    }

    // Filter by price range
    results = results.filter((product) => {
      if (product.isFree) return filters.priceRange[0] === 0
      const price = Number.parseInt(product.price.replace(/[^0-9]/g, ""))
      return price >= filters.priceRange[0] && price <= filters.priceRange[1]
    })

    // Filter by distance
    if (currentLocation && filters.location) {
      results = results.filter((product) => {
        const productLocation = product.location.split(", FL")[0]
        const distance = calculateDistance(currentLocation, productLocation)
        return distance <= filters.distance
      })
    }

    // Sort results
    switch (filters.sortBy) {
      case "price-low":
        results.sort((a, b) => {
          const priceA = a.isFree ? 0 : Number.parseInt(a.price.replace(/[^0-9]/g, ""))
          const priceB = b.isFree ? 0 : Number.parseInt(b.price.replace(/[^0-9]/g, ""))
          return priceA - priceB
        })
        break
      case "price-high":
        results.sort((a, b) => {
          const priceA = a.isFree ? 0 : Number.parseInt(a.price.replace(/[^0-9]/g, ""))
          const priceB = b.isFree ? 0 : Number.parseInt(b.price.replace(/[^0-9]/g, ""))
          return priceB - priceA
        })
        break
      case "newest":
      default:
        // Already sorted by newest
        break
    }

    setFilteredProducts(results)
  }, [searchQuery, filters, currentLocation])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const newUrl = searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search"
    router.push(newUrl)
  }

  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
    } else {
      newFavorites.add(productId)
    }
    setFavorites(newFavorites)
  }

  const clearFilters = () => {
    setFilters({
      category: "",
      priceRange: [0, 10000],
      condition: "",
      location: "",
      sortBy: "newest",
      distance: 25,
    })
  }

  const activeFiltersCount = [
    filters.category,
    filters.condition,
    filters.location,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 ? "price" : "",
    filters.distance < 25 ? "distance" : "",
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Input
            placeholder="Search marketplace..."
            className="pl-4 pr-10 bg-gray-50 border-0 rounded-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="relative">
          <Filter className="w-4 h-4" />
          {activeFiltersCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-purple-600">{activeFiltersCount}</Badge>
          )}
        </Button>
      </header>

      {showFilters && (
        <SearchFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
          onClear={clearFilters}
        />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {searchQuery ? `Results for "${searchQuery}"` : "All Items"}
            </h1>
            <p className="text-sm text-gray-600">{filteredProducts.length} items found</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <SortAsc className="w-4 h-4 mr-2" />
            Sort
          </Button>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            {filters.category && (
              <Badge variant="secondary" className="gap-1">
                {filters.category}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, category: "" })} />
              </Badge>
            )}
            {filters.condition && (
              <Badge variant="secondary" className="gap-1">
                {filters.condition}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, condition: "" })} />
              </Badge>
            )}
            {filters.location && (
              <Badge variant="secondary" className="gap-1">
                {filters.location}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, location: "" })} />
              </Badge>
            )}
            {filters.priceRange[0] > 0 ||
              (filters.priceRange[1] < 10000 && (
                <Badge variant="secondary" className="gap-1">
                  Price: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setFilters({ ...filters, priceRange: [0, 10000] })}
                  />
                </Badge>
              ))}
            {filters.distance < 25 && (
              <Badge variant="secondary" className="gap-1">
                Distance: {filters.distance} miles
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, distance: 25 })} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-purple-600">
              Clear all
            </Button>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Filter className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
            <Button onClick={clearFilters} variant="outline">
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onFavoriteToggle={toggleFavorite}
                isFavorited={favorites.has(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  )
}
