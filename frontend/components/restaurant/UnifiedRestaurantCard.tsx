'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

import FeedbackButton from '@/components/feedback/FeedbackButton';
import { Restaurant } from '@/lib/types/restaurant';
import { useFavorites } from '@/lib/utils/favorites';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { cn } from '@/lib/utils/cn';
import { commonTypography, commonSpacing } from '@/lib/utils/commonStyles';
import cardStyles from '@/components/core/cards/Card.module.css';
import {
  formatPriceRange,
  formatPriceDollarSigns, 
  titleCase
} from '@/lib/utils/cardUtils';
import { getFallbackImageUrl } from '@/lib/utils/imageFallback';
import { getKosherCategoryBadgeClasses } from '@/lib/utils/kosherCategories';
import { 
  getBusinessTypeDisplayName, 
  getBusinessTypeIcon, 
  getBusinessTypeColor,
  parseReviewSnippets,
  getAverageRating
} from '@/lib/utils/reviewUtils';

interface UnifiedRestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed' | 'eatery';
  onCardClick?: () => void;
  showFeedbackButton?: boolean;
  showBusinessType?: boolean;
  showReviewCount?: boolean;
  showDetails?: boolean;
  onLike?: (restaurant: Restaurant) => void;
  isLiked?: boolean;
  priority?: boolean;
}

export default function UnifiedRestaurantCard({ 
  restaurant, 
  className = "", 
  variant = 'default',
  onCardClick,
  showFeedbackButton = false,
  showBusinessType = true,
  showReviewCount = true,
  showDetails = false,
  onLike,
  isLiked: externalIsLiked,
  priority = false
}: UnifiedRestaurantCardProps) {
  const router = useRouter();
  const { isFavorite } = useFavorites();
  const [imageLoading, setImageLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const { handleImmediateTouch } = useMobileTouch();

  // Sync with external like state
  useEffect(() => {
    if (externalIsLiked !== undefined) {
      setIsLiked(externalIsLiked);
    } else {
      setIsLiked(isFavorite(restaurant.id));
    }
  }, [externalIsLiked, isFavorite, restaurant.id]);

  const handleCardClick = handleImmediateTouch(() => {
    if (onCardClick) {
      onCardClick();
    } else {
      router.push(`/eatery/${restaurant.id}`);
    }
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    if (onLike) {
      onLike(restaurant);
    }
  };

  const getRating = () => {
    // First try to get rating from review snippets (RestaurantCard logic)
    const reviewSnippets = parseReviewSnippets(restaurant.review_snippets);
    if (reviewSnippets.length > 0) {
      const avgRating = getAverageRating(reviewSnippets);
      if (avgRating > 0) {
        return avgRating;
      }
    }
    
    // Fallback to existing rating fields (EateryCard logic)
    const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating;
    return rating && rating > 0 ? rating : 0.0;
  };

  const getReviewCount = () => {
    const reviewSnippets = parseReviewSnippets(restaurant.review_snippets);
    return reviewSnippets.length;
  };

  const getHeroImage = () => {
    // Use the new fallback system to prevent 404 errors
    return getFallbackImageUrl(
      restaurant.image_url,
      restaurant.kosher_category,
      { enableLogging: process.env.NODE_ENV === 'development' }
    );
  };

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageLoading(false);
    
    // Log the error in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`🖼️ Image failed to load:`, restaurant.image_url);
    }
  };

  // Get business type information
  const businessType = restaurant.business_types;
  const businessTypeDisplay = getBusinessTypeDisplayName(businessType);
  const businessTypeIcon = getBusinessTypeIcon(businessType);
  const businessTypeColor = getBusinessTypeColor(businessType);

  // Get kosher category color and styling - original working glassy version
  const getKosherCategoryStyle = () => {
    const category = restaurant.kosher_category?.toLowerCase();
    if (category === 'dairy') {
      return 'text-white';
    } else if (category === 'meat') {
      return 'text-white';
    } else if (category === 'pareve') {
      return 'text-white';
    } else {
      return 'text-white';
    }
  };

  const heroSrc = getHeroImage();
  const isImageUrl = typeof heroSrc === "string" && heroSrc.startsWith("http");

  // Determine card styling based on variant
  const getCardStyle = () => {
    switch (variant) {
      case 'eatery':
        return 'w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation restaurant-card flex flex-col';
      case 'compact':
        return cn('bg-white rounded-xl shadow-sm border border-gray-200 p-2', 'hover:scale-[1.02]');
      case 'detailed':
        return cn('bg-white rounded-xl shadow-md border border-gray-200', 'hover:scale-[1.02]');
      default:
        return cn('bg-white rounded-xl shadow-md border border-gray-200', 'hover:scale-[1.02]');
    }
  };

  // Determine image container styling
  const getImageContainerStyle = () => {
    switch (variant) {
      case 'eatery':
        return 'relative aspect-[5/4] overflow-hidden rounded-3xl flex-shrink-0';
      case 'compact':
        return 'relative aspect-[4/3] overflow-hidden rounded-t-xl';
      default:
        return 'relative aspect-[3/4] overflow-hidden rounded-t-xl';
    }
  };

  // Determine content container styling
  const getContentStyle = () => {
    switch (variant) {
      case 'eatery':
        return 'bg-transparent flex-1 flex flex-col p-3';
      case 'compact':
        return 'p-2';
      default:
        return commonSpacing.card;
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onTouchStart={(_e) => {
        // Don't prevent default - let the click event fire
      }}
      className={cn(getCardStyle(), className)}
      data-clickable="true"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(e as any);
        }
      }}
      aria-label={`View details for ${restaurant.name}`}
      style={{
        // Ensure proper touch handling on mobile
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        position: 'relative',
        zIndex: 1,

      }}
    >
      {/* Image Container */}
      <div className={getImageContainerStyle()}>
        {/* Loading Placeholder */}
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Restaurant Image */}
        {isImageUrl ? (
          <Image
            src={heroSrc}
            alt={restaurant.name}
            fill
            className={`object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes="200px"
            unoptimized={heroSrc.includes('cloudinary.com') || heroSrc.includes('googleusercontent.com') || heroSrc.includes('unsplash.com')}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-4xl text-gray-400">🍽️</div>
          </div>
        )}

        {/* Kosher Category Badge */}
        <AnimatePresence>
          {restaurant.kosher_category && (
            <motion.span 
              className={cn(
                "absolute rounded-full shadow-md font-medium truncate",
                variant === 'eatery' 
                  ? `top-3 left-3 text-xs px-2.5 py-1.5 max-w-[calc(100%-4rem)] ${cardStyles['kosher-badge']} ${getKosherCategoryStyle()}`
                  : `top-2 left-2 px-1.5 py-0.5 ${commonTypography.badge} ${getKosherCategoryBadgeClasses(restaurant.kosher_category)}`
              )}
              style={variant === 'eatery' ? {
                backgroundColor: restaurant.kosher_category?.toLowerCase() === 'meat' 
                  ? 'rgba(239, 68, 68, 0.7)' 
                  : restaurant.kosher_category?.toLowerCase() === 'dairy'
                  ? 'rgba(59, 130, 246, 0.7)'
                  : restaurant.kosher_category?.toLowerCase() === 'pareve'
                  ? 'rgba(234, 179, 8, 0.7)'
                  : 'rgba(107, 114, 128, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                isolation: 'isolate'
              } : undefined}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              title={titleCase(restaurant.kosher_category)}
            >
              {titleCase(restaurant.kosher_category)}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Business Type Badge */}
        {showBusinessType && businessType && businessType !== 'None' && variant !== 'eatery' && (
          <span className={`absolute top-2 left-12 px-2 py-0.5 rounded-full shadow-md text-xs font-medium ${businessTypeColor}`}>
            <span className="mr-1">{businessTypeIcon}</span>
            {businessTypeDisplay}
          </span>
        )}
        
        {/* Favorite Button */}
        <motion.button
          onClick={handleFavoriteClick}
          className={cn(
            variant === 'eatery' 
              ? "absolute top-3 right-3 w-10 h-10 px-2 py-0 transition-all duration-200 hover:scale-105 z-10 flex items-center justify-center active:scale-95 group"
              : "absolute top-2 right-2 w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 z-10 flex items-center justify-center"
          )}
          aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
          title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
          {...(variant === 'eatery' ? {
            whileHover: { scale: 1.1 },
            whileTap: { scale: 0.9 },
            initial: { opacity: 0, scale: 0.8 },
            animate: { opacity: 1, scale: 1 },
            transition: { delay: 0.3, duration: 0.3 }
          } : {})}
          style={{
            // Ensure button is clickable on mobile
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            minHeight: variant === 'eatery' ? '44px' : '24px',
            minWidth: variant === 'eatery' ? '44px' : '24px',
            zIndex: 10,

          }}
        >
          {variant === 'eatery' ? (
            <motion.div
              whileTap={{ scale: 0.8 }}
              animate={{ scale: isLiked ? 1.1 : 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <Heart
                className={`w-5 h-5 transition-all duration-150 ease-out stroke-white stroke-2 drop-shadow-sm ${
                  isLiked 
                    ? 'fill-red-500 text-red-500' 
                    : 'fill-transparent text-white group-hover:fill-red-500 group-hover:text-red-500'
                }`}
              />
            </motion.div>
          ) : (
            <Heart 
              size={12} 
              className={cn(
                "w-3 h-3 transition-all duration-200",
                isLiked ? "text-red-500 fill-current" : "text-gray-400 hover:text-red-500"
              )} 
            />
          )}
        </motion.button>

        {/* Feedback Button */}
        {showFeedbackButton && (
          <div className="absolute top-2 right-2">
            <FeedbackButton
              restaurantId={parseInt(restaurant.id.toString())}
              restaurantName={restaurant.name}
              variant="minimal"
            />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className={getContentStyle()}>
        {variant === 'eatery' ? (
          // Eatery-style content layout
          <>
            {/* Restaurant Name - Fixed height container with proper alignment */}
            <div className="flex items-start w-full min-w-0 flex-shrink-0 h-8 mb-1">
              <h3 
                className="font-bold text-gray-900 leading-tight w-full min-w-0 text-left text-base" 
                title={titleCase(restaurant.name)}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block'
                }}
              >
                {titleCase(restaurant.name)}
              </h3>
            </div>
            
            {/* Price Range, Distance and Rating - Fixed height meta row with consistent alignment */}
            <div className="flex items-center justify-between min-w-0 w-full flex-shrink-0 h-6 gap-2">
              <span className="text-gray-700 font-medium flex-shrink-0 text-sm">
                {formatPriceDollarSigns(restaurant.price_range, restaurant.min_avg_meal_cost, restaurant.max_avg_meal_cost)}
              </span>
              
              {restaurant.distance && (
                <span className="text-gray-500 text-sm flex-1 text-right mr-2">
                  {restaurant.distance}
                </span>
              )}
              
              <div className="flex items-center gap-1 flex-shrink-0" style={{ minWidth: 'fit-content' }}>
                <Star className="fill-yellow-400 text-yellow-400 flex-shrink-0 w-3.5 h-3.5" />
                <span className="font-semibold text-gray-800 whitespace-nowrap flex-shrink-0 text-sm">
                  {getRating().toFixed(1)}
                </span>
              </div>
            </div>

            {/* Additional Details - Only show if showDetails is true */}
            {showDetails && (
              <div 
                className="space-y-2 mt-4 pt-4 border-t border-gray-100 flex-1"
              >
                {/* Location */}
                {restaurant.city && (
                  <div className="flex items-center text-xs text-gray-500 min-w-0">
                    <span className="truncate break-words min-w-0 w-full location-text" title={restaurant.city}>{restaurant.city}</span>
                  </div>
                )}

                {/* Kosher Details */}
                <div className="flex flex-wrap gap-1 min-w-0 mt-3">
                  {restaurant.is_cholov_yisroel && (
                    <span className="inline-block bg-[#FCC0C5]/20 text-[#8a4a4a] rounded-full border border-[#FCC0C5] max-w-full truncate kosher-detail-badge px-2 py-1 text-xs" title="Chalav Yisroel">
                      Chalav Yisroel
                    </span>
                  )}
                  {restaurant.is_pas_yisroel && (
                    <span className="inline-block bg-[#74E1A0]/20 text-[#1a4a2a] rounded-full border border-[#74E1A0] max-w-full truncate kosher-detail-badge px-2 py-1 text-xs" title="Pas Yisroel">
                      Pas Yisroel
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          // Standard content layout
          <>
            {/* Restaurant Name and Rating on same line */}
            <div className="flex items-center justify-between mb-2">
              <h3 className={`${commonTypography.title} tracking-tight flex-1 mr-2`}>{restaurant.name}</h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                <span className={commonTypography.body}>
                  {getRating().toFixed(1)}
                </span>
                {showReviewCount && getReviewCount() > 0 && (
                  <span className="text-xs text-gray-500">
                    ({getReviewCount()})
                  </span>
                )}
              </div>
            </div>
            
            {formatPriceRange(restaurant.price_range, restaurant.min_avg_meal_cost, restaurant.max_avg_meal_cost) && (
              <p className={commonTypography.subtitle}>
                {formatPriceRange(restaurant.price_range, restaurant.min_avg_meal_cost, restaurant.max_avg_meal_cost)}
              </p>
            )}

            {/* Additional Details for detailed variant */}
            {variant === 'detailed' && showDetails && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                {/* Location */}
                {restaurant.city && (
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="truncate">{restaurant.city}</span>
                  </div>
                )}

                {/* Kosher Details */}
                <div className="flex flex-wrap gap-1">
                  {restaurant.is_cholov_yisroel && (
                    <span className="inline-block bg-[#FCC0C5]/20 text-[#8a4a4a] rounded-full border border-[#FCC0C5] px-2 py-1 text-xs" title="Chalav Yisroel">
                      Chalav Yisroel
                    </span>
                  )}
                  {restaurant.is_pas_yisroel && (
                    <span className="inline-block bg-[#74E1A0]/20 text-[#1a4a2a] rounded-full border border-[#74E1A0] px-2 py-1 text-xs" title="Pas Yisroel">
                      Pas Yisroel
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
