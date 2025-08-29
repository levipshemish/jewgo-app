"use client"

import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import styles from "./listing.module.css"

interface ImageCarouselPopupProps {
  images: string[]
  onClose: () => void
}

export function ImageCarouselPopup({ images, onClose }: ImageCarouselPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className={styles.listingPopup} onClick={onClose}>
      <div className={styles.listingPopupContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.listingPopupHeader}>
          <h3 className={styles.listingPopupTitle}>Gallery</h3>
          <button className={styles.listingPopupClose} onClick={onClose}>
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="relative">
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="w-full h-64 object-cover rounded-lg"
          />
          
          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          
          {/* Image counter */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnail navigation */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentIndex ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
