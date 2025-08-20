'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { MarketplaceListing } from '@/lib/types/marketplace';
import { cn } from '@/lib/utils/classNames';
import EnhancedMarketplaceCard from './EnhancedMarketplaceCard';
import EnhancedMarketplaceCardSkeleton from './EnhancedMarketplaceCardSkeleton';

interface EnhancedMarketplaceGridProps {
  listings?: MarketplaceListing[];
  loading?: boolean;
  className?: string;
  gridCols?: '2' | '3' | '4' | '5' | '6';
  variant?: 'default' | 'compact' | 'featured';
  showEndorsements?: boolean;
  onLike?: (listing: MarketplaceListing) => void;
  likedListings?: Set<string>;
  skeletonCount?: number;
}

export default function EnhancedMarketplaceGrid({
  listings,
  loading = false,
  className = "",
  gridCols = '4',
  variant = 'default',
  showEndorsements = true,
  onLike,
  likedListings,
  skeletonCount = 12
}: EnhancedMarketplaceGridProps) {
  const router = useRouter();

  const handleCardClick = (listing: MarketplaceListing) => {
    router.push(`/marketplace/${listing.id}`);
  };

  const handleLike = (listing: MarketplaceListing) => {
    if (onLike) {
      onLike(listing);
    }
  };

  const getGridColsClass = () => {
    switch (gridCols) {
      case '2':
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case '3':
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case '4':
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      case '5':
        return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
      case '6':
        return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7';
      default:
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    }
  };

  if (loading) {
    return (
      <div className={cn(
        "grid gap-4",
        getGridColsClass(),
        className
      )}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <EnhancedMarketplaceCardSkeleton 
            key={i} 
            variant={variant}
          />
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🛍️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No listings found
          </h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search criteria or check back later for new listings.
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse All Listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-4",
      getGridColsClass(),
      className
    )}>
      {listings.map((listing) => (
        <EnhancedMarketplaceCard
          key={listing.id}
          listing={listing}
          onClick={() => handleCardClick(listing)}
          variant={variant}
          showEndorsements={showEndorsements}
          onLike={handleLike}
          isLiked={likedListings?.has(listing.id)}
        />
      ))}
    </div>
  );
}
