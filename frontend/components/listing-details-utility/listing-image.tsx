"use client";

import { useState } from 'react';
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
  viewCount: _viewCount
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
      {totalImages > 0 && (
        <div className="absolute bottom-3 right-3 bg-background/80 dark:bg-background/60 border border-border/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur shadow-md text-foreground text-xs font-medium px-2 py-1 rounded-full">
          {currentImageIndex + 1}/{totalImages}
        </div>
      )}
    </div>
  );
}

