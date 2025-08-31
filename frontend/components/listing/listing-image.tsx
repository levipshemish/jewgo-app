"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface ListingImageProps {
  src?: string
  alt?: string
  actionLabel?: string
  onAction?: () => void
  restaurantName?: string
  allImages?: string[]
  viewCount?: number
}

export function ListingImage({
  src,
  alt,
  actionLabel = "action",
  onAction,
  restaurantName = "Restaurant",
  allImages = [],
  viewCount
}: ListingImageProps) {
  const [showCarousel, setShowCarousel] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Use provided images or fallback to demo images
  const images = allImages.length > 0 ? allImages : [
    src || "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop"
  ]

  const handleViewGallery = () => {
    if (allImages.length > 0) {
      setShowCarousel(true)
    } else if (onAction) {
      onAction()
    }
  }

  const handleCloseCarousel = () => {
    setShowCarousel(false)
    setCurrentImageIndex(0)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <>
      <div className="relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden">
        <img
          src={images[0]}
          alt={alt || `${restaurantName || 'Restaurant'} image`}
          className="w-full h-full object-cover rounded-3xl"
        />

        {/* View Count Tag - Bottom Left */}
        {viewCount !== undefined && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm text-gray-600 rounded-full px-2 py-1 text-xs font-medium shadow-sm group">
            <span className="group-hover:hidden">👁️ {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}</span>
            <span className="hidden group-hover:inline">👁️ {viewCount.toLocaleString()} views</span>
          </div>
        )}

        {/* View Gallery Button - Bottom Right */}
        {(onAction || allImages.length > 0) && (
          <Button
            onClick={handleViewGallery}
            className="absolute bottom-4 right-4 bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 transition-all rounded-full px-6"
            size="sm"
          >
            {actionLabel}
          </Button>
        )}
      </div>

      {/* Image Carousel Popup */}
      {showCarousel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCloseCarousel}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Gallery</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseCarousel}
                  className="h-7 w-7 p-0 hover:bg-gray-200 rounded-full"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Image content */}
            <div className="p-4">
              <div className="relative">
                <img
                  src={images[currentImageIndex]}
                  alt={`${restaurantName || 'Restaurant'} image ${currentImageIndex + 1}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
                
                {/* Navigation buttons */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </>
                )}
                
                {/* Image counter */}
                {images.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>

              {/* Thumbnail navigation */}
              {images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto">
                  {images.map((image, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-16 h-12 p-0 rounded-lg overflow-hidden border-2 ${
                        index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
