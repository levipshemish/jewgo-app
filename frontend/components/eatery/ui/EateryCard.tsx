'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Restaurant } from '@/lib/types/restaurant';
import { useFavorites } from '@/lib/utils/favorites';
import Image from 'next/image';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';

interface EateryCardProps {
  restaurant: Restaurant;
  className?: string;
  showDetails?: boolean;
}

export default function EateryCard({ restaurant, className = "", showDetails = false }: EateryCardProps) {
  const router = useRouter();
  const { isFavorite } = useFavorites();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const { handleImmediateTouch, isMobile } = useMobileTouch();
  
  const isMobileDevice = isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);

  // Sync with favorites manager
  useEffect(() => {
    setIsFavorited(isFavorite(restaurant.id));
  }, [isFavorite, restaurant.id]);

  const handleCardClick = handleImmediateTouch(() => {
    router.push(`/restaurant/${restaurant.id}`);
  });

  const handleFavoriteClick = handleImmediateTouch(() => {
    // Handle favorite logic here
    setIsFavorited(!isFavorited);
  });

  // Get category-based placeholder image
  const getCategoryPlaceholder = (_category: string) => {
    // Use optimized WebP placeholder
    return '/images/default-restaurant.webp';
  };

  // Title case function
  const titleCase = (str: string) => {
    if (!str) {return '';}
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  const formatPriceRange = () => {
    if (restaurant.price_range && restaurant.price_range.trim() !== '') {
      // If price_range is in format "10-35", add $ symbol
      if (restaurant.price_range.includes('-')) {
        return `$${restaurant.price_range}`;
      }
      return restaurant.price_range;
    }
    
    if (restaurant.min_avg_meal_cost && restaurant.max_avg_meal_cost) {
      return `$${restaurant.min_avg_meal_cost}-${restaurant.max_avg_meal_cost}`;
    }
    
    return 'Price Range: $';
  };

  const getRating = () => {
    const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating;
    return rating && rating > 0 ? rating : 0.0;
  };

  const getHeroImage = () => {
    // Use the centralized safe image URL function that fixes Cloudinary URLs
    let safeUrl = getSafeImageUrl(restaurant.image_url);
    // Normalize known broken 'image_1.{ext}' variant
    safeUrl = safeUrl.replace(/\/image_1\.(jpg|jpeg|png|webp|avif)$/i, '/image_1');
    
    // If we get back the default image, or there's an image error, use category placeholder
    if (safeUrl === '/images/default-restaurant.webp' || imageError) {
      return getCategoryPlaceholder(restaurant.kosher_category || restaurant.listing_type);
    }
    
    return safeUrl;
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // Get kosher category color and styling
  const getKosherCategoryStyle = () => {
    const category = restaurant.kosher_category?.toLowerCase();
    if (category === 'dairy') {
      return 'bg-white text-[#ADD8E6] font-bold';
    } else if (category === 'meat') {
      return 'bg-white text-[#A70000] font-bold';
    } else if (category === 'pareve') {
      return 'bg-white text-[#FFCE6D] font-bold';
    } else {
      return 'bg-white text-gray-500 font-bold';
    }
  };

  // Use regular divs on mobile to avoid framer-motion conflicts
  const CardContainer = isMobileDevice ? 'div' : motion.div;
  const ButtonContainer = isMobileDevice ? 'button' : motion.button;
  const SpanContainer = isMobileDevice ? 'span' : motion.span;

  const heroSrc = getHeroImage();

  return (
    <CardContainer
      onClick={handleCardClick}
      onTouchStart={(_e) => {
        // Don't prevent default - let the click event fire
        }}
      onTouchEnd={(_e) => {
        // Don't prevent default - let the click event fire
        }}
      className={`w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation restaurant-card eatery-card ${className}`}
      data-clickable="true"
      {...(isMobileDevice ? {} : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.3, ease: "easeOut" },
        whileHover: { 
          scale: 1.02,
          transition: { duration: 0.2 }
        },
        whileTap: { 
          scale: 0.98,
          transition: { duration: 0.1 }
        }
      })}
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
        // Force opacity and scale for mobile
        ...(isMobileDevice && {
          opacity: 1,
          transform: 'scale(1)'
        })
      }}
    >
      {/* Image Container - Using balanced aspect ratio */}
      <div className="relative aspect-[5/4] overflow-hidden rounded-3xl">
        {/* Loading Placeholder */}
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Restaurant Image */}
        <Image
          src={heroSrc}
          alt={restaurant.name}
          fill
          className={`object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          unoptimized={heroSrc.includes('cloudinary.com')}
        />

        {/* Kosher Category Badge - Top Left - aligned with favorite button */}
        <AnimatePresence>
          {restaurant.kosher_category && (
            <SpanContainer 
              className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium shadow-sm ${getKosherCategoryStyle()}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {titleCase(restaurant.kosher_category)}
            </SpanContainer>
          )}
        </AnimatePresence>
        
        {/* Favorite Button - Top Right */}
        <ButtonContainer
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 w-10 h-10 px-2 py-0 transition-all duration-200 hover:scale-105 z-10 flex items-start justify-center active:scale-95 group"
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          {...(isMobileDevice ? {} : {
            whileHover: { scale: 1.1 },
            whileTap: { scale: 0.9 },
            initial: { opacity: 0, scale: 0.8 },
            animate: { opacity: 1, scale: 1 },
            transition: { delay: 0.3, duration: 0.3 }
          })}
          style={{
            // Ensure button is clickable on mobile
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            minHeight: '44px',
            minWidth: '44px',
            zIndex: 10,
            // Force opacity and scale for mobile
            ...(isMobileDevice && {
              opacity: 1,
              transform: 'scale(1)'
            })
          }}
        >
          {isMobileDevice ? (
            <div
              style={{
                transform: isFavorited ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.15s ease-out'
              }}
            >
              <Heart
                className={`w-5 h-5 transition-all duration-150 ease-out stroke-white stroke-2 drop-shadow-sm ${
                  isFavorited 
                    ? 'fill-red-500 text-red-500' 
                    : 'fill-transparent text-white group-hover:fill-red-500 group-hover:text-red-500'
                }`}
              />
            </div>
          ) : (
            <motion.div
              whileTap={{ scale: 0.8 }}
              animate={{ scale: isFavorited ? 1.1 : 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <Heart
                className={`w-5 h-5 transition-all duration-150 ease-out stroke-white stroke-2 drop-shadow-sm ${
                  isFavorited 
                    ? 'fill-red-500 text-red-500' 
                    : 'fill-transparent text-white group-hover:fill-red-500 group-hover:text-red-500'
                }`}
              />
            </motion.div>
          )}
        </ButtonContainer>
      </div>

      {/* Text Content Container - Improved white background with better positioning and styling */}
      <motion.div 
        className="p-2 bg-white/95 backdrop-blur-sm rounded-2xl -mt-6 relative z-10 shadow-lg border border-white/20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {/* Restaurant Name - Bold text with standardized height */}
        <div className="min-h-8 mb-1.5 flex items-center">
          <h3 className="text-sm font-bold text-gray-900 leading-tight break-words">
            {titleCase(restaurant.name)}
          </h3>
        </div>
        
        {/* Price Range and Rating - Swapped positions */}
        <div className="flex items-center justify-between min-w-0">
          <SpanContainer className="text-xs text-gray-600 font-medium truncate flex-1 mr-2">
            {formatPriceRange()}
          </SpanContainer>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold text-gray-800">
              {getRating().toFixed(1)}
            </span>
          </div>
        </div>

        {/* Additional Details - Only show if showDetails is true */}
        {showDetails && (
          <motion.div 
            className="space-y-2 mt-3 pt-3 border-t border-gray-100"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            {/* Location */}
            {restaurant.city && (
              <div className="flex items-center text-xs text-gray-500">
                <span className="truncate break-words">{restaurant.city}</span>
              </div>
            )}

            {/* Kosher Details */}
            <div className="flex flex-wrap gap-1 mt-2">
              {restaurant.is_cholov_yisroel && (
                <SpanContainer className="inline-block px-2 py-1 bg-[#FCC0C5]/20 text-[#8a4a4a] text-xs rounded-full border border-[#FCC0C5]">
                  Chalav Yisroel
                </SpanContainer>
              )}
              {restaurant.is_pas_yisroel && (
                <SpanContainer className="inline-block px-2 py-1 bg-[#74E1A0]/20 text-[#1a4a2a] text-xs rounded-full border border-[#74E1A0]">
                  Pas Yisroel
                </SpanContainer>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </CardContainer>
  );
}