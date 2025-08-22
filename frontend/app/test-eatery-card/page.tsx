'use client';

import React from 'react';
import UnifiedCard from '@/components/ui/UnifiedCard';

export default function TestEateryCardPage() {
  // Mock restaurant data that matches the eatery page format
  const testRestaurants = [
    {
      id: '1',
      name: 'Test Restaurant 1',
      image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      kosher_category: 'Meat',
      rating: 4.5,
      star_rating: 4.5,
      google_rating: 4.5,
      quality_rating: 4.5,
      price_range: '$$$',
      distance: '2.3 mi',
      city: 'Miami',
      review_count: 150,
      is_cholov_yisroel: true,
      is_pas_yisroel: false,
    },
    {
      id: '2',
      name: 'Test Restaurant 2',
      image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
      kosher_category: 'Dairy',
      rating: 3.8,
      star_rating: 3.8,
      google_rating: 3.8,
      quality_rating: 3.8,
      price_range: '$$',
      distance: '1.7 mi',
      city: 'Miami',
      review_count: 89,
      is_cholov_yisroel: false,
      is_pas_yisroel: true,
    },
    {
      id: '3',
      name: 'Test Restaurant 3 - No Rating',
      image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      kosher_category: 'Pareve',
      rating: null,
      star_rating: null,
      google_rating: null,
      quality_rating: null,
      price_range: '$',
      distance: '5.2 mi',
      city: 'Miami',
      review_count: 0,
      is_cholov_yisroel: false,
      is_pas_yisroel: false,
    },
    {
      id: '4',
      name: 'Test Restaurant 4 - No Distance',
      image_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop',
      kosher_category: 'Fish',
      rating: 4.9,
      star_rating: 4.9,
      google_rating: 4.9,
      quality_rating: 4.9,
      price_range: '$$$$',
      distance: null,
      city: 'Miami',
      review_count: 234,
      is_cholov_yisroel: true,
      is_pas_yisroel: true,
    }
  ];

  // Transform function that matches the eatery page
  const transformRestaurantToCardData = (restaurant: any) => {
    // Enhanced rating logic with better fallbacks
    const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating || restaurant.quality_rating;
    const ratingText = rating ? `${rating.toFixed(1)}★` : undefined;
    
    // Enhanced distance logic - ensure we have a valid distance string
    const distanceText = restaurant.distance && restaurant.distance.trim() !== '' ? restaurant.distance : '';
    
    // Enhanced price range logic - ensure we have a valid price range
    const priceRange = restaurant.price_range && restaurant.price_range.trim() !== '' ? restaurant.price_range : '';
    
    return {
      id: restaurant.id,
      imageUrl: restaurant.image_url,
      imageTag: restaurant.kosher_category,
      title: restaurant.name,
      badge: ratingText, // Use the enhanced rating text
      subtitle: priceRange,
      additionalText: distanceText,
      showHeart: true,
      isLiked: false, // Will be set by the component based on favorites state
      kosherCategory: restaurant.kosher_category,
      priceRange: restaurant.price_range,
      minAvgMealCost: restaurant.min_avg_meal_cost,
      maxAvgMealCost: restaurant.max_avg_meal_cost,
      rating,
      reviewCount: restaurant.review_count,
      city: restaurant.city,
      distance: restaurant.distance,
      isCholovYisroel: restaurant.is_cholov_yisroel,
      isPasYisroel: restaurant.is_pas_yisroel,
    };
  };

  const handleCardClick = (data: any) => {
    console.log('Card clicked:', data);
  };

  const handleLikeToggle = (id: string, isLiked: boolean) => {
    console.log('Like toggled:', id, isLiked);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Eatery Card Test - UnifiedCard Component
        </h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Testing Eatery Page Data Format
          </h2>
          <p className="text-gray-600 mb-4">
            This test verifies that the UnifiedCard component works correctly with the eatery page data format,
            including distance, ratings, and heart functionality.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {testRestaurants.map((restaurant) => (
            <div key={restaurant.id} className="flex flex-col items-center">
              <UnifiedCard
                data={transformRestaurantToCardData(restaurant)}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                variant="default"
                showStarInBadge={true}
                className="hover:shadow-lg transition-shadow duration-200"
              />
              <div className="mt-2 text-xs text-gray-500 text-center">
                <div>ID: {restaurant.id}</div>
                <div>Rating: {restaurant.rating || 'none'}</div>
                <div>Distance: {restaurant.distance || 'none'}</div>
                <div>Price: {restaurant.price_range || 'none'}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Expected Behavior:</h3>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>Rating Badge:</strong> Should show star rating (e.g., "4.5★") in top-right badge</li>
            <li>✅ <strong>Distance:</strong> Should show distance (e.g., "2.3 mi") in bottom-right</li>
            <li>✅ <strong>Price Range:</strong> Should show price range (e.g., "$$$") in bottom-left</li>
            <li>✅ <strong>Heart Button:</strong> Should be white/gray, turn red on hover/click</li>
            <li>✅ <strong>Kosher Badge:</strong> Should show kosher category in top-left</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
