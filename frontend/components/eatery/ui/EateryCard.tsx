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
  const { handleImmediateTouch } = useMobileTouch();
  
  // Enhanced mobile detection with state
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
      const isMobileView = windowWidth <= 768;
      setIsMobileDevice(isMobileView);
    };
    
    checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

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
    if (!str) {
      return '';
    }
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
      // If it's already a dollar amount format, return as is
      if (restaurant.price_range.startsWith('$')) {
        return restaurant.price_range;
      }
      // If it's just numbers, assume it's a price range and add $
      if (/^\d+$/.test(restaurant.price_range)) {
        return `$${restaurant.price_range}`;
      }
      return restaurant.price_range;
    }
    
    if (restaurant.min_avg_meal_cost && restaurant.max_avg_meal_cost) {
      return `$${restaurant.min_avg_meal_cost}-${restaurant.max_avg_meal_cost}`;
    }
    
    // Return consistent format across all devices
    return '$$';
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
    
    // Additional validation for Cloudinary URLs
    if (safeUrl.includes('cloudinary.com')) {
      // Ensure proper Cloudinary URL format
      if (!safeUrl.includes('/f_auto,q_auto/')) {
        // Add Cloudinary optimization parameters if missing
        safeUrl = safeUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
      }
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
  const heroSrc = getHeroImage();

  return (
    <div
      onClick={handleCardClick}
      onTouchStart={(_e) => {
        // Don't prevent default - let the click event fire
      }}
      className={`w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation restaurant-card flex flex-col ${className}`}
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
        // Force opacity and scale for mobile
        ...(isMobileDevice && {
          opacity: 1,
          transform: 'scale(1)'
        })
      }}
    >
      {/* Image Container - Fixed aspect ratio for consistent heights */}
      <div className="relative aspect-[5/4] overflow-hidden rounded-3xl flex-shrink-0">
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
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1440px) 20vw, 16vw"
          unoptimized={heroSrc.includes('cloudinary.com')}
          priority={false}
          quality={85}
        />

        {/* Fallback Image for Loading Errors */}
        {imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-2xl mb-2">🍽️</div>
              <div className="text-gray-500 text-xs font-medium truncate px-2">
                {titleCase(restaurant.name)}
              </div>
            </div>
          </div>
        )}

        {/* Kosher Category Badge - Properly positioned with consistent spacing */}
        <AnimatePresence>
          {restaurant.kosher_category && (
            <motion.span 
              className={`absolute top-3 left-3 text-xs px-2.5 py-1.5 rounded-full font-medium shadow-md max-w-[calc(100%-4rem)] truncate kosher-badge ${getKosherCategoryStyle()}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              title={titleCase(restaurant.kosher_category)}
            >
              {titleCase(restaurant.kosher_category)}
            </motion.span>
          )}
        </AnimatePresence>
        
        {/* Favorite Button - Properly positioned with consistent spacing */}
        <motion.button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 w-10 h-10 px-2 py-0 transition-all duration-200 hover:scale-105 z-10 flex items-center justify-center active:scale-95 group"
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
        </motion.button>
      </div>

      {/* Text Content Container - Fixed height structure for consistency */}
      <div className={`bg-transparent flex-1 flex flex-col ${isMobileDevice ? 'px-2 pt-2 pb-2' : 'p-3'}`}>
        {/* Restaurant Name - Fixed height container with proper alignment */}
        <div className={`flex items-start w-full min-w-0 flex-shrink-0 ${isMobileDevice ? 'h-6 mb-1' : 'h-8 mb-1'}`}>
          <h3 
            className={`font-bold text-gray-900 leading-tight w-full min-w-0 text-left ${isMobileDevice ? 'text-sm' : 'text-base'}`} 
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
        
        {/* Price Range and Rating - Fixed height meta row with consistent alignment */}
        <div className={`flex items-center justify-between min-w-0 w-full flex-shrink-0 ${isMobileDevice ? 'h-5 gap-2' : 'h-6 gap-3'}`}>
          <span className={`text-gray-500 font-normal truncate flex-1 min-w-0 text-left price-text ${isMobileDevice ? 'text-xs' : 'text-sm'}`} title={formatPriceRange()}>
            {formatPriceRange()}
          </span>
          
          <div className="flex items-center gap-1 flex-shrink-0 rating-container" style={{ minWidth: 'fit-content' }}>
            <Star className={`fill-yellow-400 text-yellow-400 flex-shrink-0 star-icon ${isMobileDevice ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span className={`font-semibold text-gray-800 whitespace-nowrap flex-shrink-0 rating-text ${isMobileDevice ? 'text-xs' : 'text-sm'}`}>
              {getRating().toFixed(1)}
            </span>
          </div>
        </div>

        {/* Additional Details - Only show if showDetails is true */}
        {showDetails && (
          <div 
            className={`${isMobileDevice ? 'space-y-1 mt-3 pt-3' : 'space-y-2 mt-4 pt-4'} border-t border-gray-100 flex-1`}
          >
            {/* Location */}
            {restaurant.city && (
              <div className="flex items-center text-xs text-gray-500 min-w-0">
                <span className="truncate break-words min-w-0 w-full location-text" title={restaurant.city}>{restaurant.city}</span>
              </div>
            )}

            {/* Kosher Details */}
            <div className={`flex flex-wrap gap-1 min-w-0 ${isMobileDevice ? 'mt-2' : 'mt-3'}`}>
              {restaurant.is_cholov_yisroel && (
                <span className={`inline-block bg-[#FCC0C5]/20 text-[#8a4a4a] rounded-full border border-[#FCC0C5] max-w-full truncate kosher-detail-badge ${isMobileDevice ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'}`} title="Chalav Yisroel">
                  Chalav Yisroel
                </span>
              )}
              {restaurant.is_pas_yisroel && (
                <span className={`inline-block bg-[#74E1A0]/20 text-[#1a4a2a] rounded-full border border-[#74E1A0] max-w-full truncate kosher-detail-badge ${isMobileDevice ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'}`} title="Pas Yisroel">
                  Pas Yisroel
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}