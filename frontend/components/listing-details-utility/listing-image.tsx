"use client";

import { useState } from 'react';
import { Eye } from 'lucide-react';
import ImageCarousel from '@/components/restaurant/ImageCarousel';

interface ListingImageProps {
  src?: string;
  alt: string;
  actionLabel?: string; // retained for compatibility
  onAction?: () => void; // retained for compatibility
  className?: string;
  restaurantName?: string;
  allImages?: string[];
  viewCount?: number;
}

export function ListingImage({
  src,
  alt: _alt,
  actionLabel: _actionLabel = 'action',
  onAction: _onAction,
  className = '',
  restaurantName = 'Restaurant',
  allImages = [],
  viewCount
}: ListingImageProps) {
  const images = allImages.length > 0 ? allImages : src ? [src] : [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [totalImages, setTotalImages] = useState(images.length);

  // Debug logging
  console.log('🖼️ [LISTING IMAGE] viewCount received:', viewCount, 'type:', typeof viewCount);

  const handleIndexChange = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleImagesProcessed = (processedImages: string[]) => {
    setTotalImages(processedImages.length);
  };

  return (
    <div className={`relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden ${className}`}>
      <ImageCarousel
        images={images}
        restaurantName={restaurantName}
        className="h-full w-full rounded-3xl"
        onIndexChange={handleIndexChange}
        onImagesProcessed={handleImagesProcessed}
      />
      
      {/* Image Navigation Tag - Bottom Left */}
      {totalImages > 0 && (
        <div 
          className="absolute bottom-3 left-3 text-foreground text-xs font-medium px-2 py-1 rounded-full"
          style={{
            // Same glassmorphism as header bar
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            isolation: 'isolate',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
            position: 'relative',
          }}
        >
          {/* Dark background layer for backdrop-filter */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.08) 100%)',
              zIndex: -1,
            }}
          />
          {/* Glass highlight overlay */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
              borderRadius: 'inherit',
            }}
          />
          <span className="relative z-10">{currentImageIndex + 1}/{totalImages}</span>
        </div>
      )}

      {/* View Count Tag - Bottom Right */}
      {typeof viewCount === "number" && viewCount >= 0 && (
        <div 
          className="absolute bottom-3 right-3 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 z-50"
          style={{
            // More visible styling for debugging
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid red', // Debug border
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Eye className="h-3 w-3 text-blue-400 flex-shrink-0" />
          <span className="tabular-nums">{viewCount.toLocaleString()}</span>
        </div>
      )}
      
      {/* Debug: Always show a test tag */}
      <div 
        className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded z-50"
      >
        DEBUG: viewCount = {String(viewCount)} ({typeof viewCount})
      </div>
    </div>
  );
}

