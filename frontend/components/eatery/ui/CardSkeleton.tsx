import React from 'react';

interface CardSkeletonProps {
  className?: string;
}

export default function CardSkeleton({ className = "" }: CardSkeletonProps) {
  return (
    <div className={`bg-white rounded-lg overflow-hidden shadow-sm animate-pulse w-full ${className}`}>
      {/* Image Container Skeleton - Wider and shorter */}
      <div className="relative aspect-[4/3] bg-gray-200">
        {/* Kosher Badge Skeleton - aligned with favorite button */}
        <div className="absolute top-2 left-2 w-12 h-5 bg-gray-300 rounded-full"></div>
        
        {/* Favorite Button Skeleton - aligned with kosher badge */}
        <div className="absolute top-2 right-2 w-6 h-6 bg-transparent border-none rounded-full"></div>
        
        {/* Status Badge Skeleton - Removed */}
        {/* <div className="absolute bottom-1 right-1 w-10 h-5 bg-gray-300 rounded-full"></div> */}
      </div>
      
      {/* Content Skeleton - Match reference spacing */}
      <div className="p-2">
        {/* Restaurant Name Skeleton - Match reference size */}
        <div className="h-4 bg-gray-200 rounded mb-1"></div>
        
        {/* Price and Rating Skeleton - Swapped positions */}
        <div className="flex items-center justify-between mb-1">
          <div className="w-6 h-3 bg-gray-200 rounded"></div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <div className="w-8 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
} 