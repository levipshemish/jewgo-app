'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils/classNames';
import { useFavorites } from '@/lib/utils/favorites';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';

// TypeScript Interfaces
interface CardData {
  id: string;
  imageUrl?: string;
  imageTag?: string;
  title: string;
  badge?: string;
  subtitle?: string;
  additionalText?: string;
  showHeart?: boolean;
  isLiked?: boolean;
}

interface UnifiedCardProps {
  data: CardData;
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCardClick?: (data: CardData) => void;
  className?: string;
  priority?: boolean;
  variant?: 'default' | 'minimal' | 'enhanced';
  showStarInBadge?: boolean; // New prop to control star icon in badge
}

// Motion variants for animations
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const }
  }
};

// Main Unified Card Component
const UnifiedCard = memo<UnifiedCardProps>(({
  data,
  onLikeToggle,
  onCardClick,
  className = '',
  priority = false,
  variant = 'default',
  showStarInBadge = false // Default to false for timestamps
}) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { handleImmediateTouch } = useMobileTouch();
  
  // State management
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Enhanced mobile detection
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
    setIsLiked(isFavorite(data.id));
  }, [isFavorite, data.id]);

  // Memoized computations
  const cardData = useMemo(() => ({
    ...data,
    imageTag: data.imageTag || '',
    badge: data.badge || '',
    subtitle: data.subtitle || formatPriceDollarSigns(data.priceRange, data.minAvgMealCost, data.maxAvgMealCost),
    additionalText: data.additionalText || data.distance || data.city || '',
    showHeart: data.showHeart !== false
  }), [data]);

  // Get safe image URL using existing utility
  const heroImageUrl = useMemo(() => {
    if (!cardData.imageUrl) {
      return null;
    }
    
    let safeUrl = getSafeImageUrl(cardData.imageUrl);
    
    // Normalize known broken Cloudinary URLs
    safeUrl = safeUrl.replace(/\/image_1\.(jpg|jpeg|png|webp|avif)$/i, '/image_1');
    
    // If we get back the default image or there's an error, use placeholder
    if (safeUrl === '/images/default-restaurant.webp' || imageError) {
      return '/images/default-restaurant.webp';
    }
    
    return safeUrl;
  }, [cardData.imageUrl, imageError]);

  // Get rating display
  const getRatingDisplay = () => {
    const rating = data.rating || parseFloat(data.badge || '0');
    return rating > 0 ? rating.toFixed(1) : null;
  };

  // Handlers
  const handleLikeToggle = useCallback(() => {
    try {
      setIsAnimating(true);
      const newIsLiked = !isLiked;
      
      if (newIsLiked) {
        const minimalRestaurant = {
          id: data.id,
          name: data.title,
          address: '',
          city: data.city || '',
          state: '',
          zip_code: '',
          phone_number: '',
          kosher_category: data.kosherCategory || 'unknown' as any,
          certifying_agency: '',
          listing_type: 'restaurant',
          status: 'active' as any,
          hours: {} as any,
          category: 'restaurant' as any
        };
        addFavorite(minimalRestaurant);
        setAnnouncement(`Added ${data.title} to favorites`);
      } else {
        removeFavorite(data.id);
        setAnnouncement(`Removed ${data.title} from favorites`);
      }
      
      setIsLiked(newIsLiked);
      onLikeToggle?.(data.id, newIsLiked);
      
      // Reset animation state
      setTimeout(() => setIsAnimating(false), 200);
    } catch (error) {
      console.warn('Card error:', error);
      setIsAnimating(false);
    }
  }, [isLiked, data.id, data.title, data.city, data.kosherCategory, onLikeToggle, addFavorite, removeFavorite]);

  const handleCardClick = handleImmediateTouch(() => {
    if (onCardClick) {
      onCardClick(cardData);
    }
  });

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick]);

  const handleHeartKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLikeToggle();
    }
  }, [handleLikeToggle]);

  // Variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return {
          cardClass: "w-[160px] rounded-xl overflow-hidden p-1",
          imageClass: "h-[100px]",
          titleClass: "text-xs font-medium",
          badgeClass: "text-xs px-1.5 py-0.5"
        };
      case 'enhanced':
        return {
          cardClass: "w-[200px] rounded-3xl overflow-hidden p-3",
          imageClass: "h-[140px]",
          titleClass: "text-base font-semibold",
          badgeClass: "text-sm px-3 py-1"
        };
      case 'eatery':
        return {
          cardClass: cardStyles.eatery,
          imageClass: "aspect-[5/4]",
          titleClass: "text-base font-bold",
          badgeClass: "text-xs px-2.5 py-1.5"
        };
      case 'compact':
        return {
          cardClass: cardStyles.compact,
          imageClass: "aspect-[4/3]",
          titleClass: "text-sm font-semibold",
          badgeClass: "text-xs px-1.5 py-0.5"
        };
      case 'detailed':
        return {
          cardClass: cardStyles.base,
          imageClass: "aspect-[3/4]",
          titleClass: "text-base font-semibold",
          badgeClass: "text-sm px-2 py-1"
        };
      default:
        return {
          cardClass: "w-[200px] rounded-2xl overflow-hidden p-2",
          imageClass: "h-[126px]",
          titleClass: "text-sm font-semibold",
          badgeClass: "text-xs px-2 py-0.5"
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Get kosher category styling
  const getKosherCategoryStyle = () => {
    if (variant === 'eatery') {
      const category = data.kosherCategory?.toLowerCase();
      if (category === 'dairy') {
        return 'bg-white text-[#ADD8E6] font-bold';
      } else if (category === 'meat') {
        return 'bg-white text-[#A70000] font-bold';
      } else if (category === 'pareve') {
        return 'bg-white text-[#FFCE6D] font-bold';
      } else {
        return 'bg-white text-gray-500 font-bold';
      }
    }
    return getKosherCategoryBadgeClasses(data.kosherCategory || '');
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ 
        y: variant === 'eatery' ? 0 : -4,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      className={cn(
        variantStyles.cardClass,
        className
      )}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${cardData.title}`}
      aria-live="polite"
      aria-describedby={`card-${cardData.id}`}
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
      {/* Persistent live region for announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      
      {/* Image Container */}
      <div className={cn(
        "relative overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 transition-transform duration-300",
        variant === 'eatery' ? "rounded-3xl flex-shrink-0" : "rounded-t-xl",
        variantStyles.imageClass
      )}>
        {/* Loading Placeholder */}
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Next.js Image Component */}
        {heroImageUrl && (
          <Image
            src={heroImageUrl}
            alt={cardData.title || 'Product image'}
            fill
            className={cn(
              "object-cover transition-all duration-300",
              variant === 'eatery' ? "rounded-3xl" : "rounded-t-xl",
              imageLoading ? 'opacity-0' : 'opacity-100',
              variant === 'eatery' ? "" : "group-hover:scale-110"
            )}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            sizes="180px"
            unoptimized={heroImageUrl.includes('cloudinary.com')}
            priority={priority}
          />
        )}
        
        {/* Image Tag - Enhanced hover effects */}
        {cardData.imageTag && (
          <>
            <style jsx>{`
              .unified-card-tag {
                position: absolute !important;
                top: ${variant === 'eatery' ? '12px' : '8px'} !important;
                left: ${variant === 'eatery' ? '12px' : '8px'} !important;
                width: 80px !important;
                max-width: 80px !important;
                min-width: 80px !important;
                height: 24px !important;
                max-height: 24px !important;
                min-height: 24px !important;
                overflow: hidden !important;
                padding: 0 8px !important;
                font-size: 12px !important;
                line-height: 1 !important;
                font-weight: 500 !important;
                background-color: rgba(255, 255, 255, 0.95) !important;
                color: #111827 !important;
                border-radius: 9999px !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                text-rendering: optimizeLegibility !important;
                -webkit-text-size-adjust: 100% !important;
                text-size-adjust: 100% !important;
                transition: all 0.2s ease-out !important;
                transform: none !important;
                backdrop-filter: blur(8px) !important;
              }
              .unified-card-tag:hover {
                background-color: rgba(255, 255, 255, 1) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
                transform: translateY(-1px) !important;
              }
              .unified-card-tag {
                cursor: pointer !important;
              }
              .unified-card-tag:active {
                transform: translateY(0px) !important;
                opacity: 1 !important;
              }
            `}</style>
            <div
              className="unified-card-tag"
              aria-label={`Tag: ${cardData.imageTag}`}
            >
              <span 
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontWeight: 'inherit'
                }}
              >
                {titleCase(cardData.imageTag)}
              </span>
            </div>
          </>
        )}
        
        {/* Heart Button - Enhanced styling */}
        {cardData.showHeart && (
          <>
            <style jsx>{`
              .unified-card-heart {
                position: absolute !important;
                top: ${variant === 'eatery' ? '12px' : '4px'} !important;
                right: ${variant === 'eatery' ? '12px' : '8px'} !important;
                width: ${variant === 'eatery' ? '40px' : '28px'} !important;
                max-width: ${variant === 'eatery' ? '40px' : '28px'} !important;
                min-width: ${variant === 'eatery' ? '40px' : '28px'} !important;
                height: ${variant === 'eatery' ? '40px' : '28px'} !important;
                max-height: ${variant === 'eatery' ? '40px' : '28px'} !important;
                min-height: ${variant === 'eatery' ? '40px' : '28px'} !important;
                background-color: transparent !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border: none !important;
                padding: 0 !important;
                cursor: pointer !important;
                -webkit-tap-highlight-color: transparent !important;
                touch-action: manipulation !important;
                z-index: 10 !important;
                transition: all 0.2s ease-out !important;
                transform: ${isAnimating ? 'scale(0.9)' : 'scale(1)'} !important;
              }
              .unified-card-heart:hover {
                transform: scale(1.1) !important;
              }
              .unified-card-heart:hover svg {
                fill: #ef4444 !important;
                stroke: #ffffff !important;
                transform: scale(1.1) !important;
              }
              .unified-card-heart:active {
                transform: scale(0.95) !important;
                opacity: 1 !important;
              }
              .unified-card-heart svg {
                width: ${variant === 'eatery' ? '20px' : '18px'} !important;
                height: ${variant === 'eatery' ? '20px' : '18px'} !important;
                transition: all 0.2s ease-out !important;
              }
            `}</style>
            <button
              className="unified-card-heart"
              onClick={(e) => {
                e.stopPropagation();
                handleLikeToggle();
              }}
              onKeyDown={handleHeartKeyDown}
              aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isLiked}
            >
              <Heart
                size={variant === 'eatery' ? 20 : 18}
                style={{
                  fill: isLiked ? '#ef4444' : '#9ca3af',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                  transition: 'all 0.2s ease-out',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
                }}
              />
            </button>
          </>
        )}
      </div>
      
      {/* Content - Enhanced layout */}
      <motion.div 
        className={cn(
          variant === 'eatery' ? "pt-2 flex flex-col" : "p-2 flex flex-col",
          variant === 'eatery' ? "px-2" : ""
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {variant === 'eatery' ? (
          // Eatery-style content layout
          <>
            {/* Restaurant Name - Fixed height container */}
            <div className="flex items-start w-full min-w-0 flex-shrink-0 h-8 mb-1">
              <h3 
                className="font-bold text-gray-900 leading-tight w-full min-w-0 text-left text-base" 
                title={titleCase(cardData.title)}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block'
                }}
              >
                {titleCase(cardData.title)}
              </h3>
            </div>
            
            {/* Price Range, Distance and Rating - Fixed height meta row */}
            <div className="flex items-center justify-between min-w-0 w-full flex-shrink-0 h-6 gap-2">
              <span className="text-gray-700 font-medium flex-shrink-0 text-sm">
                {cardData.subtitle}
              </span>
              
              {data.distance && (
                <span className="text-gray-500 text-sm flex-1 text-right mr-2">
                  {data.distance}
                </span>
              )}
              
              <div className="flex items-center gap-1 flex-shrink-0" style={{ minWidth: 'fit-content' }}>
                <Star className="fill-yellow-400 text-yellow-400 flex-shrink-0 w-3.5 h-3.5" />
                <span className="font-semibold text-gray-800 whitespace-nowrap flex-shrink-0 text-sm">
                  {getRatingDisplay() || '0.0'}
                </span>
              </div>
            </div>

            {/* Additional Details - Only show if showDetails is true */}
            {showDetails && (
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 flex-1">
                {/* Location */}
                {data.city && (
                  <div className="flex items-center text-xs text-gray-500 min-w-0">
                    <span className="truncate break-words min-w-0 w-full location-text" title={data.city}>{data.city}</span>
                  </div>
                )}

                {/* Kosher Details */}
                {showKosherDetails && (
                  <div className="flex flex-wrap gap-1 min-w-0 mt-3">
                    {data.isCholovYisroel && (
                      <span className="inline-block bg-[#FCC0C5]/20 text-[#8a4a4a] rounded-full border border-[#FCC0C5] max-w-full truncate kosher-detail-badge px-2 py-1 text-xs" title="Chalav Yisroel">
                        Chalav Yisroel
                      </span>
                    )}
                    {data.isPasYisroel && (
                      <span className="inline-block bg-[#74E1A0]/20 text-[#1a4a2a] rounded-full border border-[#74E1A0] max-w-full truncate kosher-detail-badge px-2 py-1 text-xs" title="Pas Yisroel">
                        Pas Yisroel
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Standard content layout
          <>
            <div className="flex justify-between items-start gap-2 mb-1 min-h-[20px]">
              <h3 
                className={cn(
                  variantStyles.titleClass,
                  "text-gray-800 m-0 flex-1 truncate min-w-0 transition-colors duration-200 group-hover:text-gray-900"
                )}
                aria-label={`Title: ${cardData.title}`}
              >
                {cardData.title}
              </h3>
              {cardData.badge && (
                <motion.div
                  className={cn(
                    "inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-lg font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 group-hover:bg-gray-200 group-hover:shadow-sm",
                    variantStyles.badgeClass
                  )}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                  aria-label={`Rating: ${cardData.badge}`}
                >
                  {showStarInBadge && (
                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  )}
                  {cardData.badge}
                  {showReviewCount && data.reviewCount && (
                    <span className="text-xs text-gray-500">
                      ({data.reviewCount})
                    </span>
                  )}
                </motion.div>
              )}
            </div>
            
            <div className="flex justify-between items-center min-h-[16px] relative">
              {/* Subtitle - Locked to left */}
              <div className="flex-1 min-w-0">
                {cardData.subtitle && (
                  <p 
                    className="text-xs font-bold text-black m-0 text-left whitespace-nowrap truncate transition-colors duration-200 group-hover:text-gray-900"
                    style={{ 
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    aria-label={`Price range: ${cardData.subtitle}`}
                  >
                    {cardData.subtitle}
                  </p>
                )}
              </div>
              
              {/* Spacer to ensure proper separation */}
              <div className="flex-shrink-0 w-3" />
              
              {/* Additional Text - Locked to right */}
              <div className="flex-shrink-0">
                {cardData.additionalText && (
                  <p 
                    className="text-xs text-gray-500 m-0 text-right whitespace-nowrap truncate transition-colors duration-200 group-hover:text-gray-600"
                    style={{ 
                      width: '60px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    aria-label={`Additional info: ${cardData.additionalText}`}
                  >
                    {cardData.additionalText}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
});

UnifiedCard.displayName = 'UnifiedCard';

export default UnifiedCard;
