"use client"

import { useState } from "react"
import EnhancedProductCard from "@/components/ui/UnifiedCard"
import UnifiedCardConsistent from "@/components/ui/UnifiedCardConsistent"

// Mock data for testing various scenarios
const mockRestaurantData = {
  id: "1",
  imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
  imageTag: "Kosher",
  imageTagLink: "/eatery?kosher=Kosher",
  title: "Sample Restaurant",
  badge: "4.5",
  subtitle: "$$",
  additionalText: "Italian",
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

// Edge case scenarios
const longTextData = {
  id: "3",
  imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
  imageTag: "VeryLongCategoryName",
  imageTagLink: "/category/long",
  title: "This is a very long restaurant name that should be truncated properly",
  badge: "4.9★",
  subtitle: "$$$-$$$$",
  additionalText: "Very long text here",
  showHeart: true,
}

const minimalData = {
  id: "4",
  title: "Minimal Card",
  // All other fields are optional
}

const noImageData = {
  id: "5",
  title: "No Image Restaurant",
  badge: "4.2",
  subtitle: "$",
  showHeart: true,
}

const specialCharsData = {
  id: "6",
  imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
  imageTag: "Café™",
  imageTagLink: "/cafe",
  title: "Café & Bistro™ • 🍕",
  badge: "★5.0",
  subtitle: "€€€",
  additionalText: "© 2024",
  showHeart: true,
}

const rtlData = {
  id: "7",
  imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
  imageTag: "כשר",
  title: "مطعم الشرق الأوسط",
  badge: "4.7",
  subtitle: "₪₪₪",
  additionalText: "العربية",
  showHeart: true,
}

const errorImageData = {
  id: "8",
  imageUrl: "https://invalid-url-that-will-fail.com/image.jpg",
  imageTag: "Error",
  title: "Error Image Test",
  badge: "N/A",
  subtitle: "Test",
  showHeart: true,
}

export default function TestUnifiedCardPage() {
  const [likedCards, setLikedCards] = useState<Set<string>>(new Set())
  const [interactionLog, setInteractionLog] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setInteractionLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10))
  }

  const handleCardClick = (data: any) => {
    console.log("Card clicked:", data)
    addLog(`Card clicked: ${data.title} (ID: ${data.id})`)
  }

  const handleLikeToggle = (id: string, isLiked: boolean) => {
    console.log("Like toggled:", { id, isLiked })
    setLikedCards(prev => {
      const newSet = new Set(prev)
      if (isLiked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
    addLog(`Like toggled: ${id} - ${isLiked ? 'Liked' : 'Unliked'}`)
  }

  const handleTagClick = (tagLink: string, event: React.MouseEvent) => {
    console.log("Tag clicked:", tagLink)
    addLog(`Tag clicked: ${tagLink}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            UnifiedCard Component Test Suite
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Comprehensive testing of the UnifiedCard component with various scenarios including 
            edge cases, special characters, RTL support, and error handling.
          </p>
        </div>

        {/* Comparison Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            Original vs Consistent Version Comparison
          </h2>
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 text-center mb-4">
                Original EnhancedProductCard
              </h3>
              <div className="flex justify-center">
                <EnhancedProductCard
                  data={{...mockRestaurantData, isLiked: likedCards.has(mockRestaurantData.id)}}
                  onCardClick={handleCardClick}
                  onLikeToggle={handleLikeToggle}
                  onTagClick={handleTagClick}
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 text-center mb-4">
                Consistent Version (No Hover States)
              </h3>
              <div className="flex justify-center">
                <UnifiedCardConsistent
                  data={{...mockRestaurantData, isLiked: likedCards.has('consistent-1')}}
                  onCardClick={handleCardClick}
                  onLikeToggle={(id, liked) => handleLikeToggle('consistent-1', liked)}
                  onTagClick={handleTagClick}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Basic Examples Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            Basic Examples
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
            {/* Restaurant Card */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 text-center">
                Restaurant
              </h3>
              <EnhancedProductCard
                data={{...mockRestaurantData, isLiked: likedCards.has(mockRestaurantData.id)}}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
              />
            </div>

            {/* Marketplace Card */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 text-center">
                Marketplace
              </h3>
              <EnhancedProductCard
                data={{...mockMarketplaceData, isLiked: likedCards.has(mockMarketplaceData.id)}}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
              />
            </div>

            {/* Minimal Data */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 text-center">
                Minimal
              </h3>
              <EnhancedProductCard
                data={minimalData}
                onCardClick={handleCardClick}
              />
            </div>

            {/* No Image */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 text-center">
                No Image
              </h3>
              <EnhancedProductCard
                data={{...noImageData, isLiked: likedCards.has(noImageData.id)}}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
              />
            </div>
          </div>
        </section>

        {/* Edge Cases Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            Edge Cases
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
            {/* Long Text */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 text-center">
                Long Text
              </h3>
              <EnhancedProductCard
                data={{...longTextData, isLiked: likedCards.has(longTextData.id)}}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
              />
            </div>

            {/* Special Characters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 text-center">
                Special Chars
              </h3>
              <EnhancedProductCard
                data={{...specialCharsData, isLiked: likedCards.has(specialCharsData.id)}}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
              />
            </div>

            {/* RTL Support */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 text-center">
                RTL Text
              </h3>
              <EnhancedProductCard
                data={{...rtlData, isLiked: likedCards.has(rtlData.id)}}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
              />
            </div>

            {/* Error Image */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 text-center">
                Error Image
              </h3>
              <EnhancedProductCard
                data={{...errorImageData, isLiked: likedCards.has(errorImageData.id)}}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
              />
            </div>
          </div>
        </section>

        {/* Interactive Console */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Interaction Log
          </h2>
          <div className="bg-gray-900 text-green-400 rounded-lg p-6 font-mono text-sm">
            <div className="mb-4 text-gray-400">
              Console output (last 10 interactions):
            </div>
            {interactionLog.length === 0 ? (
              <div className="text-gray-500">No interactions yet. Try clicking on cards, hearts, or tags!</div>
            ) : (
              <div className="space-y-1">
                {interactionLog.map((log, index) => (
                  <div key={index} className="opacity-{100 - index * 10}">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Feature Documentation */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Component Features
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                ✨ Visual Features
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Smooth loading animations with skeleton placeholders</li>
                <li>• Graceful image error handling with fallbacks</li>
                <li>• Text truncation for long content</li>
                <li>• Responsive design across all screen sizes</li>
                <li>• Hover effects and micro-interactions</li>
                <li>• Support for RTL languages and special characters</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                🎯 Functional Features
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Click handlers for cards, tags, and favorites</li>
                <li>• Keyboard navigation support</li>
                <li>• Accessibility compliance (ARIA labels, roles)</li>
                <li>• Screen reader announcements</li>
                <li>• Event propagation control</li>
                <li>• Performance optimizations</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Test Instructions */}
        <section className="mb-16">
          <div className="bg-blue-50 rounded-lg p-8">
            <h3 className="text-xl font-bold text-blue-800 mb-6">
              🧪 Testing Guidelines
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-blue-700 mb-3">Interactive Testing</h4>
                <ul className="text-blue-600 space-y-2">
                  <li>• Click cards to test navigation callbacks</li>
                  <li>• Toggle heart buttons to test favorites</li>
                  <li>• Click tags to test tag navigation</li>
                  <li>• Resize browser to test responsive behavior</li>
                  <li>• Use keyboard navigation (Tab, Enter, Space)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-3">Edge Case Testing</h4>
                <ul className="text-blue-600 space-y-2">
                  <li>• Verify long text truncation</li>
                  <li>• Check special character rendering</li>
                  <li>• Test RTL text alignment</li>
                  <li>• Confirm error image fallback</li>
                  <li>• Monitor console for errors</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
