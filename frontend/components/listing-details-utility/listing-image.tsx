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
}

export function ListingImage({ 
  src, 
  alt, 
  actionLabel: _actionLabel = "action", 
  onAction, 
  className = "",
  restaurantName = "Restaurant",
  allImages = []
}: ListingImageProps) {
  const [showCarousel, setShowCarousel] = useState(false)

  // Debug logging
  console.log('=== LISTING IMAGE DEBUG ===')
  console.log('src:', src)
  console.log('allImages:', allImages)
  console.log('allImages.length:', allImages.length)
  console.log('==========================')


  const handleViewGallery = () => {
    if (allImages.length > 0) {
      setShowCarousel(true)
    } else if (onAction) {
      onAction()
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== '/images/default-restaurant.webp') {
      console.log(`🖼️ Image failed to load, using fallback:`, target.src);
      console.log(`🖼️ Original src was:`, src);
      target.src = '/images/default-restaurant.webp';
      target.onerror = null; // Prevent infinite loops
    }
  };

  return (
    <div className={`relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden ${className}`}>
      {src ? (
        <Image 
          src={src || "/images/default-restaurant.webp"} 
          alt={alt} 
          fill 
          className="object-cover rounded-3xl"
          onError={handleImageError}
          priority={false}
        />
      ) : (
        <div className="relative h-full rounded-3xl overflow-hidden">
          <Image
            src="/images/default-restaurant.webp"
            alt="Default restaurant image"
            fill
            className="object-cover rounded-3xl"
            onError={handleImageError}
          />
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
