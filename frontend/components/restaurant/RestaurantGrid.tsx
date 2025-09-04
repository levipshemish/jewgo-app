'use client';

import React from 'react';

import { Restaurant } from '@/lib/types/restaurant';

import UnifiedRestaurantCard from './UnifiedRestaurantCard';

interface RestaurantGridProps {
  restaurants: Restaurant[];
  loading?: boolean;
  onRestaurantClick?: (restaurant: Restaurant) => void;
}

export default function RestaurantGrid({ 
  restaurants, loading = false, onRestaurantClick 
}: RestaurantGridProps) {
  // Deduplicate restaurants by name+city, keeping the lowest priced entry
  const deduplicatedRestaurants = React.useMemo(() => {
    const seen = new Map<string, Restaurant>();
    
    restaurants.forEach(restaurant => {
      const key = `${restaurant.name.toLowerCase()}-${restaurant.city?.toLowerCase()}`;
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, restaurant);
      } else {
        // Keep the one with lower price if available
        const existingPrice = existing.min_avg_meal_cost || existing.max_avg_meal_cost || Infinity;
        const currentPrice = restaurant.min_avg_meal_cost || restaurant.max_avg_meal_cost || Infinity;
        
        if (currentPrice < existingPrice) {
          seen.set(key, restaurant);
        }
      }
    });
    
    return Array.from(seen.values());
  }, [restaurants]);

  if (loading) {
    return (
      <div className="container mx-auto px-2 py-2 pb-24">
        <div className="grid grid-cols-2 gap-1">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse min-w-0">
              <div className="relative aspect-[5/4] bg-gray-200"></div>
              <div className="p-1 text-sm">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (deduplicatedRestaurants.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 pb-24">
        <div className="text-center py-16">
          <div className="text-gray-400 text-6xl mb-4">🍽️</div>
          <div className="text-gray-500 text-lg mb-3 font-medium">
            No restaurants found
          </div>
          <div className="text-gray-400 text-sm">
            Try adjusting your search or filters
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 py-2 pb-24">
      <div className="grid grid-cols-2 gap-1">
        {deduplicatedRestaurants.map((restaurant) => (
          <UnifiedRestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            variant="default"
            showFeedbackButton={true}
            showBusinessType={true}
            showReviewCount={true}
            {...(onRestaurantClick && { onCardClick: () => onRestaurantClick(restaurant) })}
          />
        ))}
      </div>
    </div>
  );
} 
