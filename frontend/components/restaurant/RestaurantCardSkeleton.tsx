import React from 'react';

const RestaurantCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md min-w-0 animate-pulse">
      {/* Image Section - matching aspect-[4/3] */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {/* Main image skeleton */}
        <div className="w-full h-full bg-gray-200 animate-pulse"></div>
        
        {/* Kosher Type Badge Skeleton - top-2 left-2 */}
        <div className="absolute top-2 left-2 bg-white w-16 h-6 rounded-full shadow-sm animate-pulse"></div>

        {/* Favorite Button Skeleton - top-2 right-2 */}
        <div className="absolute top-2 right-2 bg-white w-8 h-8 rounded-full shadow animate-pulse"></div>

        {/* Rating Skeleton - bottom-2 left-2 */}
        <div className="absolute bottom-2 left-2 bg-white/90 w-12 h-6 rounded-lg animate-pulse"></div>
      </div>

      {/* Content Section - matching p-3 text-sm */}
      <div className="p-3 text-sm">
        {/* Restaurant name skeleton */}
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1 animate-pulse"></div>
        
        {/* Agency and city skeleton */}
        <div className="h-3 bg-gray-200 rounded w-full mb-1 animate-pulse"></div>
        
        {/* Status skeleton */}
        <div className="h-3 bg-gray-200 rounded w-12 mt-1 animate-pulse"></div>
      </div>
    </div>
  );
};

export default RestaurantCardSkeleton; 