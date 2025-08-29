"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye, X } from "lucide-react"
import styles from "./listing.module.css"

interface ListingImageProps {
  imageUrl?: string
  imageAlt?: string
  imageActionLabel?: string
  viewCount?: number
  onViewGallery?: () => void
  className?: string
}

export function ListingImage({
  imageUrl,
  imageAlt,
  imageActionLabel,
  viewCount,
  onViewGallery,
  className
}: ListingImageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showCarousel, setShowCarousel] = useState(false)

  // Mock images for demonstration
  const images = [
    imageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop"
  ]

  const handleViewGallery = () => {
    setShowCarousel(true)
    onViewGallery?.()
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
      <div className={`${styles.listingImage} ${className}`}>
        <img
          src={imageUrl || images[0]}
          alt={imageAlt || "Restaurant image"}
          className="w-full h-full object-cover"
        />
        
        <div className={styles.listingImageOverlay} />
        
        {/* View Gallery Tag - Top Right */}
        {imageActionLabel && (
          <div className={styles.listingImageTag} onClick={handleViewGallery}>
            <Eye className="h-3 w-3 mr-1" />
            {imageActionLabel}
          </div>
        )}

        {/* View Count Tag - Bottom Left */}
        {viewCount !== undefined && (
          <div className={`${styles.listingViewCount} group`}>
            <span className="group-hover:hidden">
              👁️ {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}
            </span>
            <span className="hidden group-hover:inline">
              👁️ {viewCount.toLocaleString()} views
            </span>
          </div>
        )}
      </div>

      {/* Image Carousel Popup */}
      {showCarousel && (
        <div className={styles.listingPopup} onClick={handleCloseCarousel}>
          <div className={styles.listingPopupContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.listingPopupHeader}>
              <h3 className={styles.listingPopupTitle}>Gallery</h3>
              <button className={styles.listingPopupClose} onClick={handleCloseCarousel}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="relative">
              <img
                src={images[currentImageIndex]}
                alt={`Image ${currentImageIndex + 1}`}
                className="w-full h-64 object-cover rounded-lg"
              />
              
              {/* Navigation buttons */}
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
              >
                ←
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
              >
                →
              </button>
              
              {/* Image counter */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
