'use client';

import { Heart, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import FeedbackButton from '@/components/feedback/FeedbackButton';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { Restaurant } from '@/lib/types/restaurant';
import { cn } from '@/lib/utils/cn';
import { commonTypography, commonSpacing } from '@/lib/utils/commonStyles';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';
import { getKosherCategoryBadgeClasses } from '@/lib/utils/kosherCategories';
import { 
  getBusinessTypeDisplayName, 
  getBusinessTypeIcon, 
  getBusinessTypeColor,
  parseReviewSnippets,
  getAverageRating
} from '@/lib/utils/reviewUtils';

interface EateryCardProps {
  restaurant: Restaurant;
  className?: string;
}

export default function EateryCard({ restaurant, className = "" }: EateryCardProps) {
  const router = useRouter();
  const { handleImmediateTouch } = useMobileTouch();

  const handleCardClick = handleImmediateTouch(() => {
    router.push(`/restaurant/${restaurant.id}`);
  });

  const formatPriceRange = () => {
    if (restaurant.price_range) {
      return restaurant.price_range;
    }
    
    if (restaurant.min_avg_meal_cost && restaurant.max_avg_meal_cost) {
      return `$${restaurant.min_avg_meal_cost} - $${restaurant.max_avg_meal_cost}`;
    }
    
    return null;
  };

  const getRating = () => {
    // First try to get rating from review snippets
    const reviewSnippets = parseReviewSnippets(restaurant.review_snippets);
    if (reviewSnippets.length > 0) {
      const avgRating = getAverageRating(reviewSnippets);
      if (avgRating > 0) {
        return avgRating;
      }
    }
    
    // Fallback to existing rating fields
    const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating;
    return rating && rating > 0 ? rating : 0.0;
  };

  const titleCase = (str: string) => {
    if (!str) {
      return '';
    }
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  // Get business type information
  const businessType = restaurant.business_types;
  const businessTypeDisplay = getBusinessTypeDisplayName(businessType);
  const businessTypeIcon = getBusinessTypeIcon(businessType);
  const businessTypeColor = getBusinessTypeColor(businessType);

  // Get review information
  const reviewSnippets = parseReviewSnippets(restaurant.review_snippets);
  const reviewCount = reviewSnippets.length;

  return (
    <div 
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={cn(
        'bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer min-w-0 w-full',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Image Section with proper rounded corners */}
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
          <OptimizedImage
            src={getSafeImageUrl(restaurant.image_url) || '/images/default-restaurant.webp'}
            alt={restaurant.name}
            aspectRatio="photo"
            containerClassName="w-full h-full"
            loading="lazy"
            showLoadingState={false}
          />
          
          {/* Kosher Category Badge */}
          {restaurant.kosher_category && (
            <span className={`absolute top-2 left-2 px-2 py-1 rounded-full shadow-sm bg-white/90 backdrop-blur-sm ${commonTypography.badge} ${
              getKosherCategoryBadgeClasses(restaurant.kosher_category)
            }`}>
              {titleCase(restaurant.kosher_category)}
            </span>
          )}

          {/* Business Type Badge */}
          {businessType && businessType !== 'None' && (
            <span className={`absolute top-2 left-12 px-2 py-1 rounded-full shadow-sm bg-white/90 backdrop-blur-sm text-xs font-medium ${businessTypeColor}`}>
              <span className="mr-1">{businessTypeIcon}</span>
              {businessTypeDisplay}
            </span>
          )}

          {/* Favorite Button */}
          <button 
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110 z-10 flex items-center justify-center"
            title="Favorite"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart size={12} className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content Section with proper spacing */}
      <div className="p-3">
        {/* Restaurant Name and Rating on same line */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex-1 mr-2 line-clamp-1">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-700 font-medium">
              {getRating().toFixed(1)}
            </span>
            {reviewCount > 0 && (
              <span className="text-xs text-gray-500">
                ({reviewCount})
              </span>
            )}
          </div>
        </div>
        
        {formatPriceRange() && (
          <p className="text-xs text-gray-600">
            {formatPriceRange()}
          </p>
        )}
      </div>

      {/* Add feedback button */}
      <div className="absolute top-2 right-2">
        <FeedbackButton
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          variant="minimal"
        />
      </div>
    </div>
  );
}