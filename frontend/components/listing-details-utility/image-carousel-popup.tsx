"use client"

import { Button } from "@/components/ui-listing-utility/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"

interface ImageCarouselPopupProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
  restaurantName: string
}

export function ImageCarouselPopup({
  isOpen,
  onClose,
  images,
  restaurantName,
}: ImageCarouselPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
      } else if (event.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % images.length)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when popup is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, images.length])

  if (!isOpen || images.length === 0) return null

  return typeof window !== 'undefined' ? createPortal(
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" 
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-2 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{restaurantName}</h3>
              <p className="text-sm text-gray-600">
                Image {currentIndex + 1} of {images.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-200 rounded-full text-black hover:text-black border border-gray-300 hover:border-gray-400 bg-white/80 hover:bg-white"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Image Carousel */}
        <div className="relative bg-black">
          {/* Main Image */}
          <div className="relative h-96 sm:h-[500px] flex items-center justify-center">
            <img
              src={images[currentIndex]}
              alt={`${restaurantName} - Image ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (target.src !== "/images/default-restaurant.webp") {
                  console.log(`🖼️ Carousel image failed to load, using fallback:`, target.src);
                  target.src = "/images/default-restaurant.webp";
                  target.onerror = null; // Prevent infinite loops
                }
              }}
            />

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                >
                  <ChevronLeft size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                >
                  <ChevronRight size={20} />
                </Button>
              </>
            )}
          </div>

          {/* Thumbnail Navigation */}
          {images.length > 1 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={image || `thumb-${index}`}
                    onClick={() => goToImage(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        if (target.src !== "/images/default-restaurant.webp") {
                          target.src = "/images/default-restaurant.webp";
                          target.onerror = null; // Prevent infinite loops
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Click outside, press ESC, or use arrow keys to navigate
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null
}
