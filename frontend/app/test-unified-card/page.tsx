"use client"

import { useState, useEffect } from "react"
import { RestaurantsAPI } from "@/lib/api/restaurants"
import { fetchMarketplaceListings } from "@/lib/api/marketplace"
import EnhancedProductCard from "@/components/ui/UnifiedCard"

interface Restaurant {
  id: string
  name: string
  image_url?: string
  rating?: number
  star_rating?: number
  google_rating?: number
  price_range?: string
  min_avg_meal_cost?: number
  max_avg_meal_cost?: number
  kosher_category?: string
  city?: string
  review_snippets?: string
}

interface MarketplaceListing {
  id: string
  title: string
  price_cents: number
  currency?: string
  city?: string
  kind: string
  category_name?: string
  created_at: string
  images?: string[]
  thumbnail?: string
}

// Helper functions
const formatPriceRange = (priceRange?: string, minCost?: number, maxCost?: number): string => {
  if (priceRange) return priceRange
  if (minCost && maxCost) return `$${minCost} - $${maxCost}`
  if (minCost) return `From $${minCost}`
  return "$10 - $35"
}

const formatPrice = (cents: number, currency = "USD"): string => {
  const amount = cents / 100
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export default function TestUnifiedCardPage() {
  const [restaurantData, setRestaurantData] = useState<Restaurant | null>(null)
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch restaurant data
        const restaurantsResponse = await RestaurantsAPI.fetchRestaurants(1)
        if (restaurantsResponse.restaurants && restaurantsResponse.restaurants.length > 0) {
          const restaurant = restaurantsResponse.restaurants[0]
          setRestaurantData({
            id: restaurant.id.toString(),
            name: restaurant.name,
            image_url: restaurant.image_url,
            rating: restaurant.rating,
            star_rating: restaurant.star_rating,
            google_rating: restaurant.google_rating,
            price_range: restaurant.price_range,
            min_avg_meal_cost: restaurant.min_avg_meal_cost,
            max_avg_meal_cost: restaurant.max_avg_meal_cost,
            kosher_category: restaurant.kosher_category,
            city: restaurant.city,
            review_snippets: restaurant.review_snippets
          })
        }

        // Fetch marketplace data
        const marketplaceResponse = await fetchMarketplaceListings({ limit: 1 })
        if (marketplaceResponse.success && marketplaceResponse.data?.listings && marketplaceResponse.data.listings.length > 0) {
          const listing = marketplaceResponse.data.listings[0]
          setMarketplaceData({
            id: listing.id.toString(),
            title: listing.title,
            price_cents: listing.price_cents || 0,
            currency: listing.currency,
            city: listing.city,
            kind: listing.kind || 'sale',
            category_name: listing.category_name,
            created_at: listing.created_at,
            images: listing.images,
            thumbnail: listing.thumbnail
          })
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to fetch data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCardClick = (data: any) => {
    console.log("Card clicked:", data)
  }

  const handleLikeToggle = (id: string, isLiked: boolean) => {
    console.log("Like toggled:", { id, isLiked })
  }

  const handleTagClick = (tagLink: string, event: React.MouseEvent) => {
    console.log("Tag clicked:", tagLink)
    // Show a notification or alert to demonstrate the link functionality
    alert(`Tag link clicked! Would navigate to: ${tagLink}`)
    // In a real app, you might use router.push(tagLink) or window.open(tagLink)
  }

  // Transform restaurant data for the card
  const restaurantCardData = restaurantData ? {
    id: restaurantData.id,
    imageUrl: restaurantData.image_url,
    imageTag: restaurantData.kosher_category || "Kosher",
    imageTagLink: `/eatery?kosher=${encodeURIComponent(restaurantData.kosher_category || "Kosher")}`,
    title: restaurantData.name,
    badge: restaurantData.rating?.toString() || "4.5",
    subtitle: formatPriceRange(restaurantData.price_range, restaurantData.min_avg_meal_cost, restaurantData.max_avg_meal_cost),
    additionalText: "Secondary additional text placeholder",
    showHeart: true,
    isLiked: false
  } : null

  // Transform marketplace data for the card
  const marketplaceCardData = marketplaceData ? {
    id: marketplaceData.id,
    imageUrl: marketplaceData.thumbnail || marketplaceData.images?.[0],
    imageTag: marketplaceData.category_name || "Category",
    imageTagLink: `/marketplace?category=${encodeURIComponent(marketplaceData.category_name || "Category")}`,
    title: marketplaceData.title,
    badge: "Placeholder Badge",
    subtitle: formatPrice(marketplaceData.price_cents, marketplaceData.currency),
    additionalText: formatTimeAgo(marketplaceData.created_at),
    showHeart: true,
    isLiked: false
  } : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            UnifiedCard Component Test
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Testing the enhanced UnifiedCard component with real API data from your database.
            This demonstrates how both restaurant and marketplace cards should look with standardized design.
          </p>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Restaurant Card */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Restaurant Card
            </h2>
            {restaurantCardData ? (
              <div className="flex justify-center">
                <EnhancedProductCard
                  data={restaurantCardData}
                  onCardClick={handleCardClick}
                  onLikeToggle={handleLikeToggle}
                  onTagClick={handleTagClick}
                  className="!bg-transparent !shadow-none [&_*]:!text-gray-900"
                />
              </div>
            ) : (
              <div className="text-center text-gray-500">
                No restaurant data available
              </div>
            )}
          </div>

          {/* Marketplace Card */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Marketplace Card
            </h2>
            {marketplaceCardData ? (
              <div className="flex justify-center">
                <EnhancedProductCard
                  data={marketplaceCardData}
                  onCardClick={handleCardClick}
                  onLikeToggle={handleLikeToggle}
                  onTagClick={handleTagClick}
                  className="!bg-transparent !shadow-none [&_*]:!text-gray-900"
                />
              </div>
            ) : (
              <div className="text-center text-gray-500">
                No marketplace data available
              </div>
            )}
          </div>
        </div>

        {/* Raw Data Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Restaurant API Data
            </h3>
            <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded overflow-auto max-h-64">
              {restaurantData ? JSON.stringify(restaurantData, null, 2) : "No data"}
            </pre>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Marketplace API Data
            </h3>
            <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded overflow-auto max-h-64">
              {marketplaceData ? JSON.stringify(marketplaceData, null, 2) : "No data"}
            </pre>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            Test Instructions
          </h3>
          <ul className="text-blue-700 space-y-2">
            <li>• Click on the cards to test navigation</li>
            <li>• Click the heart buttons to test favorites functionality</li>
            <li>• Click the tags to test tag interactions</li>
            <li>• Check the console for interaction logs</li>
            <li>• Verify the responsive design on different screen sizes</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
