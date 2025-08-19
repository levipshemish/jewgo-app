'use client';

import React from 'react';
import UnifiedCard, { CardData } from '@/components/ui/UnifiedCard';
import { Restaurant } from '@/lib/types/restaurant';
import { useFavorites } from '@/lib/utils/favorites';

interface EateryCardProps {
  restaurant: Restaurant;
  className?: string;
  showDetails?: boolean;
}

export default function EateryCard({ restaurant, className = "", showDetails = false }: EateryCardProps) {
  const { isFavorite } = useFavorites();

  // Convert Restaurant to CardData format
  const cardData: CardData = {
    id: String(restaurant.id),
    name: restaurant.name,
    description: restaurant.short_description,
    image_url: restaurant.image_url,
    rating: restaurant.rating,
    star_rating: restaurant.star_rating,
    google_rating: restaurant.google_rating,
    price_range: restaurant.price_range,
    min_avg_meal_cost: restaurant.min_avg_meal_cost,
    max_avg_meal_cost: restaurant.max_avg_meal_cost,
    address: restaurant.address,
    kosher_category: restaurant.kosher_category,
    listing_type: restaurant.listing_type,
    // Include any additional properties that don't conflict
    ...Object.fromEntries(
      Object.entries(restaurant).filter(([key]) => 
        !['id', 'name', 'description', 'image_url', 'rating', 'star_rating', 
          'google_rating', 'price_range', 'min_avg_meal_cost', 'max_avg_meal_cost',
          'address', 'kosher_category', 'listing_type'].includes(key)
      )
    )
  };

  return (
    <UnifiedCard
      data={cardData}
      type="restaurant"
      className={className}
      showDetails={showDetails}
      isFavorite={isFavorite(restaurant.id)}
      defaultImage="/images/default-restaurant.webp"
      routePrefix="/restaurant"
    />
  );
}