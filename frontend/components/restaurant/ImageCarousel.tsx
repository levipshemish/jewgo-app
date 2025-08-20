'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';

import { useScrollSnapCarousel } from '@/lib/hooks/useScrollSnapCarousel';
import { processRestaurantImages } from '@/lib/utils/imageValidation';

interface ImageCarouselProps {
  images?: string[];
  restaurantName: string;
  kosherCategory?: string;
  className?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ 
  images = [], restaurantName, kosherCategory, className = '' 
}) => {
  const [imageError, setImageError] = useState<boolean[]>([]);
  const [imageLoading, setImageLoading] = useState<boolean[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Process and validate images, combining with fallbacks
  const allImages = React.useMemo(() => {
    // Ensure images is always an array
    const safeImages = Array.isArray(images) ? images : [];
    
    // Use the new validation utility to process images
    const maxImages = safeImages.length > 0 ? safeImages.length : 1;
    const processedImages = processRestaurantImages(safeImages, kosherCategory, maxImages) || [];
    
    // Ensure processedImages is an array before filtering
    if (!Array.isArray(processedImages)) {
      return [];
    }
    
    // Additional validation: remove any images that are clearly problematic
    const validatedImages = processedImages.filter(img => {
      if (!img || typeof img !== 'string') {
        return false;
      }
      if (img.trim() === '') {
        return false;
      }
      
      // Skip obviously problematic URLs
      if (img.includes('undefined') || img.includes('null')) {
        return false;
      }
      if (img.includes('placeholder') && img.includes('default')) {
        return false;
      }
      // Allow Cloudinary URLs unless obviously broken; normalize image_1.{ext} to extensionless
      if (img.includes('cloudinary.com')) {
        if (/undefined|null/.test(img)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Ensure validatedImages is an array before mapping
    if (!Array.isArray(validatedImages)) {
      return [];
    }
    
    // Normalize known broken 'image_1.{ext}' variants to extensionless so Cloudinary can serve best format
    const normalized = validatedImages.map((u) =>
      u.replace(/(res\.cloudinary\.com\/[^\s]*\/image\/upload\/)(?!.*?\/)(.*)/, (full) => full)
       .replace(/\/image_1\.(jpg|jpeg|png|webp|avif)$/i, '/image_1')
    );

    return normalized;
  }, [images, kosherCategory]);

  // Initialize image error and loading states
  useEffect(() => {
    setImageError(new Array(allImages.length).fill(false));
    setImageLoading(new Array(allImages.length).fill(true));
  }, [allImages.length]);

  // Use the scroll-snap carousel hook
  const {
    currentIndex,
    scrollContainerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    goToSlide,
    nextSlide,
    prevSlide
  } = useScrollSnapCarousel({
    totalSlides: allImages.length,
    debounceMs: 50
  });

  const handleImageError = (index: number) => {
    setImageError(prev => {
      const newErrors = [...prev];
      newErrors[index] = true;
      return newErrors;
    });
    setImageLoading(prev => {
      const newLoading = [...prev];
      newLoading[index] = false;
      return newLoading;
    });
  };

  const handleImageLoad = (index: number) => {
    setImageLoading(prev => {
      const newLoading = [...prev];
      newLoading[index] = false;
      return newLoading;
    });
  };



  if (allImages.length === 0) {
    return (
      <div className={`relative h-96 bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-gray-600 font-medium">No images available</p>
            <p className="text-gray-500 text-sm mt-1">Check back later for photos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full restaurant-image-carousel">
      <div 
        ref={carouselRef}
        className={`relative dynamic-hero bg-gray-200 ${className}`}
      >
        {/* Scrollable container with snap */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory touch-pan-y select-none h-full"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-y'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          role="region"
          aria-label={`${restaurantName} image gallery`}
          aria-roledescription="carousel"
        >
          {allImages.map((image, index) => (
            <div
              key={index}
              className="flex-none w-full snap-center relative h-full"
              style={{ 
                minWidth: '100%',
                scrollSnapAlign: 'center'
              }}
            >
              {/* Loading state */}
              {imageLoading[index] && (
                <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              {/* Image */}
              <Image
                src={image || ''}
                alt={`${restaurantName} - Image ${index + 1}`}
                fill
                className={`object-cover transition-opacity duration-300 ${
                  imageLoading[index] ? 'opacity-0' : 'opacity-100'
                }`}
                sizes="200px"
                priority={index === 0}
                onError={() => handleImageError(index)}
                onLoad={() => handleImageLoad(index)}
                unoptimized={Boolean(image && (image.includes('cloudinary.com') || image.includes('googleusercontent.com') || image.includes('images.unsplash.com')))}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              

            </div>
          ))}
        </div>

        {/* Image Counter - adjust offsets so it never sits on the white card overlap */}
        <div className="absolute bottom-8 sm:bottom-10 md:bottom-20 lg:bottom-24 xl:bottom-28 right-4 bg-black bg-opacity-50 text-white dynamic-spacing-sm dynamic-rounded-md dynamic-text-xs font-medium z-20">
          {currentIndex + 1}/{allImages.length}
        </div>

        {/* Navigation Arrows - Desktop Only */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 dynamic-icon-xl bg-black bg-opacity-50 hover:bg-opacity-70 text-white dynamic-rounded-full flex items-center justify-center z-10 transition-all duration-200 hover:scale-110 hidden md:flex focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              aria-label="Previous image"
            >
              <ChevronLeft className="dynamic-icon-md" />
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 dynamic-icon-xl bg-black bg-opacity-50 hover:bg-opacity-70 text-white dynamic-rounded-full flex items-center justify-center z-10 transition-all duration-200 hover:scale-110 hidden md:flex focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              aria-label="Next image"
            >
              <ChevronRight className="dynamic-icon-md" />
            </button>
          </>
        )}

        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Dots Indicator - Below Image */}
      {allImages.length > 1 && (
        <div className="flex justify-center space-x-3 py-3">
          {allImages.slice(0, 5).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                index === currentIndex 
                  ? 'bg-white shadow-md' 
                  : 'bg-white bg-opacity-60 hover:bg-opacity-80'
              }`}
              aria-label={`Go to image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel; 