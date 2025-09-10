"use client";

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

  return (
    <div className={`relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden ${className}`}>
      <ImageCarousel
        images={images}
        restaurantName={restaurantName}
        className="h-full w-full rounded-3xl"
      />
    </div>
  );
}

