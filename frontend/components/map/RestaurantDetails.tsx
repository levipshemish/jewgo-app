/**
 * Restaurant Details - Card Component for Live Map
 * 
 * Uses the Card component to display restaurant details when a marker is selected.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLivemapStore, sel } from '@/lib/stores/livemap-store';
import Card from '@/components/core/cards/Card';
import { calculateDistance, formatDistance } from '@/lib/utils/distance';
import { getBestAvailableRating, formatRating } from '@/lib/utils/ratingCalculation';

export default function RestaurantDetails() {
  const selected = useLivemapStore(sel.selected);
  const favorites = useLivemapStore(sel.favorites);
  const select = useLivemapStore((state) => state.select);
  const toggleFavorite = useLivemapStore((state) => state.toggleFavorite);
  const userLocation = useLivemapStore(sel.userLocation);
  const router = useRouter();

  if (!selected) {
    return null;
  }

  const isFavorited = favorites.has(selected.id);

  // Calculate distance from user location
  let distanceText = '';
  if (userLocation && selected.pos) {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      selected.pos.lat,
      selected.pos.lng
    );
    distanceText = formatDistance(distance);
  }

  // Get the best available rating (matching eatery page)
  const getRestaurantRating = (restaurant: any) => {
    const rating = getBestAvailableRating(restaurant);
    return formatRating(rating);
  };

  // Transform restaurant to Card data format (matching eatery page exactly)
  const cardData = {
    id: selected.id,
    title: selected.name,
    imageUrl: (selected as any).image_url || '',
    badge: getRestaurantRating(selected),
    subtitle: (selected as any).price_range || '',
    additionalText: distanceText || (selected as any).zip_code || '',
    showHeart: true,
    isLiked: isFavorited,
    kosherCategory: selected.kosher.toLowerCase(),
    city: (selected as any).address || '',
    imageTag: selected.kosher.toLowerCase(),
  };

  const handleCardClick = () => {
    router.push(`/eatery/${selected.id}`);
  };

  const handleToggleFavorite = (_id: string, _isLiked: boolean) => {
    toggleFavorite(selected.id);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-8 sm:right-8 max-w-sm mx-auto z-50">
      <div className="relative">
        <Card
          data={cardData}
          onCardClick={handleCardClick}
          onLikeToggle={handleToggleFavorite}
          variant="map"
          showStarInBadge={!!selected.rating}
          className=""
        />
        
        {/* Close Button - Overlay on top-right */}
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              select(null);
            }}
            className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-gray-800 rounded-full p-1.5 shadow-lg transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}