"use client"

import { useState } from "react"
import EnhancedProductCard from "@/components/ui/UnifiedCard"

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto w-full">
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
        <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-12 min-w-0" style={{ minWidth: 'fit-content' }}>
          {/* Restaurant Card */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Restaurant Card
            </h2>
            <div className="flex justify-center w-full">
              <div className="w-[160px] sm:w-[200px] flex-shrink-0">
                <EnhancedProductCard
                  data={mockRestaurantData}
                  onCardClick={handleCardClick}
                  onLikeToggle={handleLikeToggle}
                  onTagClick={handleTagClick}
                  className="!bg-transparent !shadow-none [&_*]:!text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Marketplace Card */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Marketplace Card
            </h2>
            <div className="flex justify-center w-full">
              <div className="w-[160px] sm:w-[200px] flex-shrink-0">
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
