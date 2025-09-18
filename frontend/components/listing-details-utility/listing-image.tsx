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
      
      {/* Image Count Tag - Bottom Right */}
      {totalImages > 1 && (
        <div 
          className="absolute bottom-3 right-3 text-foreground text-xs font-medium px-2 py-1 rounded-full inline-flex items-center"
          style={{
            // Glassmorphism styling
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            isolation: 'isolate',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
            position: 'relative',
            minWidth: 'fit-content',
            width: 'auto',
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
          <span className="relative z-10 tabular-nums whitespace-nowrap">{currentImageIndex + 1}/{totalImages}</span>
        </div>
      )}
    </div>
  );
}

