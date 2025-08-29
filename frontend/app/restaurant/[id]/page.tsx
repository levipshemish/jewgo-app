'use client';

import { useParams } from 'next/navigation';
import React from 'react';
import { ListingPage } from '@/components/listing/listing-page';
import { useRestaurantDetails } from '@/hooks/use-restaurant-details';
import { useLocation } from '@/lib/contexts/LocationContext';
import { mapRestaurantToListingData } from '@/utils/restaurant-mapping';

const RestaurantDetailPage: React.FC = () => {
  const params = useParams();
  const restaurantId = params?.['id'] as string;
  
  // Fetch restaurant data
  const { data: restaurant, loading, error } = useRestaurantDetails(restaurantId);
  
  // Get user location for distance calculation
  const { userLocation } = useLocation();

  // Map restaurant data to listing format
  const listingData = restaurant ? mapRestaurantToListingData(restaurant, userLocation) : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Production-like full-screen view */}
      <div className="w-full max-w-sm sm:max-w-none sm:px-8 md:px-12 lg:px-16 xl:px-20 mx-auto">
        <ListingPage 
          data={listingData} 
          loading={loading} 
          error={error || undefined}
        />
      </div>
    </div>
  );
};

export default RestaurantDetailPage; 