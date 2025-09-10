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

  // Memoize the images array to prevent unnecessary re-renders
  const stableImages = React.useMemo(() => allImages, [allImages]);

  // Initialize image loading states
  useEffect(() => {
    setImageLoading(new Array(stableImages.length).fill(true));
  }, [stableImages.length]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    if (stableImages.length > 0) {
      const timeout = setTimeout(() => {
        setImageLoading(prev => prev.map(() => false));
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [stableImages.length]);

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
    totalSlides: stableImages.length,
    debounceMs: 50
  });

  const handleImageError = (index: number) => {
    console.log(`Image ${index} failed to load:`, stableImages[index]);
    setImageLoading(prev => {
      const newLoading = [...prev];
      newLoading[index] = false;
      return newLoading;
    });
  };

  const handleImageLoad = (index: number) => {
    console.log(`Image ${index} loaded successfully:`, stableImages[index]);
    setImageLoading(prev => {
      const newLoading = [...prev];
      newLoading[index] = false;
      return newLoading;
    });
  };

  if (stableImages.length === 0) {
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
          className="flex overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory select-none h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x pan-y'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          role="region"
          aria-label={`${restaurantName} image gallery`}
          aria-roledescription="carousel"
        >
          {stableImages.map((image, index) => (
            <div
              key={image || `img-${index}`}
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
                src={image || '/images/default-restaurant.webp'}
                alt={`${restaurantName} - Image ${index + 1}`}
                fill
                className={`object-cover transition-opacity duration-300 ${
                  imageLoading[index] ? 'opacity-0' : 'opacity-100'
                }`}
                sizes="200px"
                priority={index === 0}
                onError={() => handleImageError(index)}
                onLoad={() => handleImageLoad(index)}
                unoptimized={true}
                loading={index === 0 ? 'eager' : 'lazy'}
                crossOrigin="anonymous"
              />
              
            </div>
          ))}
        </div>


        {/* Navigation Arrows - Desktop Only */}
        {stableImages.length > 1 && (
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

        {/* Dots Indicator - Bottom Center Overlay */}
        {stableImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
            {stableImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${
                  index === currentIndex 
                    ? 'bg-white shadow-sm' 
                    : 'bg-white bg-opacity-50 hover:bg-opacity-70'
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
