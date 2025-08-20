"use client"

import { useState, useEffect } from "react"
import { RestaurantsAPI } from "@/lib/api/restaurants"
import { fetchMarketplaceListings } from "@/lib/api/marketplace"
import UnifiedCard, { CardData } from "@/components/ui/UnifiedCard"

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
        if (restaurantsResponse.restaurants?.length > 0) {
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
        console.error('Error fetching data:', err)
        setError('Failed to fetch data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleRestaurantLike = (data: CardData) => {
    console.log('Restaurant liked:', data.name)
  }

  const handleMarketplaceLike = (data: CardData) => {
    console.log('Marketplace listing liked:', data.name)
  }

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
          <div className="text-red-500 text-2xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            UnifiedCard Component Test
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This page demonstrates the UnifiedCard utility component with real API data from your database.
            Both restaurant and marketplace cards use the same component with different data structures.
          </p>
        </div>

        {/* Cards Container */}
        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
          {/* Restaurant Card */}
          <div className="flex-1 max-w-sm">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                🍽️ Restaurant Card
              </h2>
              <div className="space-y-4">
                {restaurantData ? (
                              <UnifiedCard
              data={restaurantData}
              type="restaurant"
              onFavoriteClick={handleRestaurantLike}
              className="w-full"
            />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No restaurant data available
                  </div>
                )}
              </div>
              
              {/* Restaurant Data Structure */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Data Structure:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Tag:</strong> Kosher category (top left)</li>
                  <li>• <strong>Title:</strong> Restaurant name</li>
                  <li>• <strong>Badge:</strong> Rating (top right)</li>
                  <li>• <strong>Additional Text:</strong> Price range</li>
                  <li>• <strong>Secondary Text:</strong> City location</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Marketplace Card */}
          <div className="flex-1 max-w-sm">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                🛍️ Marketplace Card
              </h2>
              <div className="space-y-4">
                {marketplaceData ? (
                  <UnifiedCard
                    data={{
                      ...marketplaceData,
                      name: marketplaceData.title // Map title to name for CardData
                    }}
                    type="marketplace"
                    onFavoriteClick={handleMarketplaceLike}
                    className="w-full"
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No marketplace data available
                  </div>
                )}
              </div>
              
              {/* Marketplace Data Structure */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Data Structure:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Tag:</strong> Category name (top left)</li>
                  <li>• <strong>Title:</strong> Product title</li>
                  <li>• <strong>Badge:</strong> Listing type (top right)</li>
                  <li>• <strong>Additional Text:</strong> Price in bold</li>
                  <li>• <strong>Secondary Text:</strong> Timestamp</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* API Information */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            API Integration Details
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Restaurant API:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Endpoint: <code className="bg-gray-100 px-1 rounded">/api/restaurants</code></li>
                <li>• Data Source: PostgreSQL restaurants table</li>
                <li>• Fields: name, image_url, rating, price_range, kosher_category, city</li>
                <li>• Validation: Database field mapping constants</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Marketplace API:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Endpoint: <code className="bg-gray-100 px-1 rounded">/api/v4/marketplace/listings</code></li>
                <li>• Data Source: PostgreSQL marketplace table</li>
                <li>• Fields: title, price_cents, category_name, created_at, images</li>
                <li>• Validation: Type-safe data handling</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Component Features */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            UnifiedCard Features
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🎨 Design System</h3>
              <p className="text-sm text-blue-700">
                Consistent visual design across all card types with unified spacing, typography, and interactions.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">🔗 Database Integration</h3>
              <p className="text-sm text-green-700">
                Direct mapping to your database schemas with validation utilities and type safety.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">⚡ Performance</h3>
              <p className="text-sm text-purple-700">
                Optimized image loading, error handling, and accessibility features for production use.
              </p>
            </div>
          </div>
        </div>

        {/* Raw Data Display */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Raw API Data
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Restaurant Data:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-64">
                {restaurantData ? JSON.stringify(restaurantData, null, 2) : 'No data available'}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Marketplace Data:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-64">
                {marketplaceData ? JSON.stringify(marketplaceData, null, 2) : 'No data available'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
