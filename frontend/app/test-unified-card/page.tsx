"use client"

import { useState, useEffect } from "react"
import dynamic from 'next/dynamic'

// Dynamically import components to prevent module system issues
const EnhancedProductCard = dynamic(() => import("@/components/ui/UnifiedCard"), {
  ssr: false,
  loading: () => <div className="w-[200px] h-[200px] bg-gray-200 rounded-2xl animate-pulse" />
})

// Mock data for testing
const mockRestaurantData = {
  id: "1",
  imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
  imageTag: "Kosher",
  imageTagLink: "/eatery?kosher=Kosher",
  title: "Sample Restaurant",
  badge: "4.5",
  subtitle: "$$",
  additionalText: "Great food and atmosphere!",
  showHeart: true,
  isLiked: false
}

const mockMarketplaceData = {
  id: "2",
  imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop",
  imageTag: "Electronics",
  imageTagLink: "/marketplace?category=Electronics",
  title: "Sample Marketplace Item",
  badge: "New",
  subtitle: "$25.00",
  additionalText: "Just now",
  showHeart: true,
  isLiked: false
}

export default function TestUnifiedCardPage() {
  const [componentsLoaded, setComponentsLoaded] = useState(false)

  useEffect(() => {
    const loadComponents = async () => {
      try {
        // Wait for components to be available
        await new Promise(resolve => setTimeout(resolve, 100))
        setComponentsLoaded(true)
      } catch (err) {
        console.error("Error loading components:", err)
      }
    }

    loadComponents()
  }, [])

  const handleCardClick = (data: any) => {
    console.log("Card clicked:", data)
  }

  const handleLikeToggle = (id: string, isLiked: boolean) => {
    console.log("Like toggled:", { id, isLiked })
  }

  const handleTagClick = (tagLink: string, event: React.MouseEvent) => {
    console.log("Tag clicked:", tagLink)
    alert(`Tag link clicked! Would navigate to: ${tagLink}`)
  }

  if (!componentsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test data...</p>
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
            Testing the enhanced UnifiedCard component with mock data.
            This demonstrates how both restaurant and marketplace cards should look with standardized design.
          </p>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          {/* Restaurant Card */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Restaurant Card
            </h2>
            <div className="flex justify-center">
              <EnhancedProductCard
                data={mockRestaurantData}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
                className="!bg-transparent !shadow-none [&_*]:!text-gray-900"
              />
            </div>
          </div>

          {/* Marketplace Card */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Marketplace Card
            </h2>
            <div className="flex justify-center">
              <EnhancedProductCard
                data={mockMarketplaceData}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
                className="!bg-transparent !shadow-none [&_*]:!text-gray-900"
              />
            </div>
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
