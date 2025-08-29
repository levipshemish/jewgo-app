"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState } from "react"
import { ImageCarouselPopup } from "./image-carousel-popup"

interface ListingImageProps {
  src?: string
  alt: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  restaurantName?: string
  allImages?: string[]
  viewCount?: number
}

export function ListingImage({ 
  src, 
  alt, 
  actionLabel = "action", 
  onAction, 
  className = "",
  restaurantName = "Restaurant",
  allImages = [],
  viewCount
}: ListingImageProps) {
  const [showCarousel, setShowCarousel] = useState(false)

  const handleViewGallery = () => {
    if (allImages.length > 0) {
      setShowCarousel(true)
    } else if (onAction) {
      onAction()
    }
  }

  return (
    <div className={`relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden ${className}`}>
      {src ? (
        <Image src={src || "/placeholder.svg"} alt={alt} fill className="object-cover rounded-3xl" />
      ) : (
        <div className="relative h-full rounded-3xl overflow-hidden">
          <Image
            src="/modern-product-showcase-with-clean-background.png"
            alt="Mock product image"
            fill
            className="object-cover rounded-3xl"
          />
        </div>
      )}

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

      {/* Image Carousel Popup */}
      <ImageCarouselPopup
        isOpen={showCarousel}
        onClose={() => setShowCarousel(false)}
        images={allImages.length > 0 ? allImages : [src || ""]}
        restaurantName={restaurantName}
      />
    </div>
  )
}
