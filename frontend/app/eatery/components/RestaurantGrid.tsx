'use client';

import React from 'react';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { formatDistance } from '@/lib/utils/distance';
import type { LightRestaurant } from '../types';

type Props = {
  items: LightRestaurant[];
  loading: boolean;
  toFixedRating: (v: number | string | undefined) => string;
  onCardClick: (item: LightRestaurant) => void;
};

export default function RestaurantGrid({ items, loading, toFixedRating, onCardClick }: Props) {
  if (!items || items.length === 0) {
    if (loading) {
      return (
        <div 
          className="restaurant-grid px-2 sm:px-4 lg:px-6"
          role="grid"
          aria-label="Restaurant listings"
          aria-busy="true"
        >
          <div className="text-center py-12" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" aria-hidden="true"></div>
            <p className="text-gray-600">Loading restaurants...</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div 
      className="restaurant-grid px-2 sm:px-4 lg:px-6"
      role="grid"
      aria-label="Restaurant listings"
      aria-busy={loading}
    >
      {items.map((restaurant) => (
        <div 
          key={String(restaurant.id)}
          className="w-full" 
          role="gridcell"
        >
          <UnifiedCard
            data={{
              id: String(restaurant.id),
              imageUrl: restaurant.image_url,
              title: restaurant.name,
              badge: toFixedRating(restaurant.google_rating),
              subtitle: restaurant.price_range || '',
              additionalText: restaurant.distance
                ? formatDistance(restaurant.distance)
                : '',
              showHeart: true,
              isLiked: false,
              kosherCategory: restaurant.kosher_category || restaurant.cuisine || '',
              city: restaurant.address,
              imageTag: restaurant.kosher_category || '',
            }}
            showStarInBadge={true}
            onCardClick={() => onCardClick(restaurant)}
            priority={false}
            className="w-full h-full"
          />
        </div>
      ))}
      
      {loading && (
        <div className="col-span-full text-center py-8" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2" aria-hidden="true"></div>
          <p className="text-sm text-gray-600">Loading more restaurants...</p>
        </div>
      )}
    </div>
  );
}
