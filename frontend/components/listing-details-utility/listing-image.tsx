"use client"

import { Button } from "@/components/ui-listing-utility/button"
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

  // Debug logging
  console.log('=== LISTING IMAGE DEBUG ===')
  console.log('src:', src)
  console.log('allImages:', allImages)
  console.log('onAction:', onAction)
  console.log('allImages.length:', allImages.length)
  console.log('Should show gallery button:', onAction || allImages.length > 0)
  console.log('==========================')

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
      {viewCount !== undefined && viewCount >= 0 && (
        <div className="absolute bottom-4 left-4 bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 transition-all rounded-full px-3 py-2 text-sm font-medium shadow-sm">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span>{viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}</span>
          </span>
        </div>
      )}

      {/* View Gallery Button - Bottom Right */}
      {(onAction || allImages.length > 0) && (
        <Button
          onClick={handleViewGallery}
          className="absolute bottom-4 right-4 bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 transition-all rounded-full px-6"
          size="sm"
        >
          View Gallery
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
