'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { Star, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { useFavorites } from '@/lib/utils/favorites';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';
import cardStyles from './Card.module.css';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';

// TypeScript Interfaces
export interface CardData {
  id: string;
  imageUrl?: string;
  imageTag?: string;
  title: string;
  badge?: string | null;
  subtitle?: string;
  additionalText?: string | null;
  showHeart?: boolean;
  isLiked?: boolean;
  kosherCategory?: string;
  city?: string;
  // Specials-specific fields
  price?: {
    original?: number | string;
    sale?: number | string;
    currency?: string;
    // Discount-based pricing for specials
    discount?: {
      type: string;
      value: number;
      label: string;
    };
  };
  timeLeftSeconds?: number;
  claimsLeft?: number;
  ctaText?: string;
  overlayTag?: string;
}

export interface CardProps {
  data: CardData;
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCardClick?: (data: CardData) => void;
  className?: string;
  priority?: boolean;
  variant?: 'default' | 'minimal' | 'enhanced' | 'map';
  showStarInBadge?: boolean;
  isScrolling?: boolean;
}

// Motion variants for animations - optimized to prevent flickering
const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const }
  },
  scroll: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0 }
  },
  exit: { opacity: 1, y: 0 }
};

// Main Card Component
const Card = memo<CardProps>(({
  data,
  onLikeToggle,
  onCardClick,
  className = '',
  priority = false,
  variant = 'default',
  showStarInBadge = false,
  isScrolling: isScrollingProp
}) => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const { handleImmediateTouch } = useMobileTouch();
  const { isScrolling: localIsScrolling } = useScrollDetection({ debounceMs: 100, enableBodyClass: false });
  const isScrolling = typeof isScrollingProp === 'boolean' ? isScrollingProp : localIsScrolling;
  
  // State management
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  // Derive liked status from favorites for consistent UI state
  const liked = useMemo(() => {
    const dataIdString = data.id.toString();
    return isFavorite(dataIdString);
  }, [isFavorite, data.id]);

  // Memoized computations
  const cardData = useMemo(() => ({
    ...data,
    imageTag: data.imageTag || '',
    badge: data.badge || '',
    subtitle: data.subtitle || '',
    additionalText: data.additionalText || '',
    showHeart: data.showHeart !== false
  }), [data]);

  // Currency formatting for specials
  const formatCurrency = useCallback((value?: number | string | null, currency = 'USD') => {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const numeric = typeof value === 'string' ? Number(value) : value
    if (Number.isNaN(numeric)) {
      return null
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(numeric)
  }, []);

  // Time left calculation for specials
  const timeLeftLabel = useMemo(() => {
    if (!cardData.timeLeftSeconds || cardData.timeLeftSeconds <= 0) {
      return 'Expired'
    }

    const hours = Math.floor(cardData.timeLeftSeconds / 3600)
    const minutes = Math.floor((cardData.timeLeftSeconds % 3600) / 60)
    const seconds = cardData.timeLeftSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s left`
    }

    return `${seconds}s left`
  }, [cardData.timeLeftSeconds]);

  // Price formatting for specials
  const salePrice = formatCurrency(cardData.price?.sale, cardData.price?.currency)
  const originalPrice = formatCurrency(cardData.price?.original, cardData.price?.currency)
  
  // Handle discount-based pricing for specials
  const discountInfo = cardData.price?.discount
  const discountLabel = discountInfo?.label || ''

  // Get safe image URL using existing utility
  const heroImageUrl = useMemo(() => {
    if (!cardData.imageUrl) {
      return null;
    }
    
    // Filter out problematic URLs that don't exist or are known to be broken
    if (cardData.imageUrl.includes('example.com') || 
        cardData.imageUrl.includes('milk.jpg') || 
        cardData.imageUrl.includes('challah.jpg') || 
        cardData.imageUrl.includes('brisket.jpg') ||
        cardData.imageUrl.includes('photo-154155886943')) {
      return '/images/default-restaurant.webp';
    }
    
    // Check for Google Photos URLs that might be problematic
    if (cardData.imageUrl.includes('googleusercontent.com') && 
        (cardData.imageUrl.includes('place-photos') || cardData.imageUrl.includes('photo'))) {
      // These URLs are valid but might fail to load, so we'll try them but have fallback ready
      // The onError handler will catch failures and show the fallback image
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

  // Handlers
  const handleLikeToggle = useCallback(() => {
    try {
      // Optimistic UI update with minimal data
      const minimalRestaurant = {
        id: data.id,
        name: data.title
      };
      
      const newIsLiked = !liked;
      const success = toggleFavorite(minimalRestaurant);
      
      if (success) {
        setAnnouncement(newIsLiked ? `Added ${data.title} to favorites` : `Removed ${data.title} from favorites`);
        onLikeToggle?.(data.id.toString(), newIsLiked);
      }
      
    } catch (_error) {
      // console.error('Error toggling favorite:', _error);
    }
  }, [liked, data.id, data.title, toggleFavorite, onLikeToggle]);

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
    const hasFullWidth = className?.includes('w-full');
    
    switch (variant) {
      case 'minimal':
        return {
          cardClass: hasFullWidth ? "w-full rounded-xl overflow-hidden p-1" : "w-[160px] rounded-xl overflow-hidden p-1",
          imageClass: "aspect-[4/3]",
          titleClass: "text-xs font-medium",
          badgeClass: "text-xs px-1.5 py-0.5"
        };
      case 'enhanced':
        return {
          cardClass: hasFullWidth ? "w-full rounded-3xl overflow-hidden p-3" : "w-[200px] rounded-3xl overflow-hidden p-3",
          imageClass: "aspect-[4/3]",
          titleClass: "text-base font-semibold",
          badgeClass: "text-sm px-3 py-1"
        };
      case 'map':
        return {
          cardClass: "w-full bg-white shadow-2xl hover:shadow-3xl transition-shadow rounded-2xl aspect-[3/2] max-w-sm h-56 border border-gray-200 overflow-hidden",
          imageClass: "h-40", // Increased from h-32 to h-40 (160px instead of 128px)6
          titleClass: "text-lg font-semibold",
          badgeClass: "text-xs px-2 py-1"
        };
      default:
        return {
          cardClass: hasFullWidth ? "w-full rounded-2xl overflow-hidden p-0" : "w-[200px] rounded-2xl overflow-hidden p-0",
          imageClass: "aspect-[4/3]",
          titleClass: "text-sm font-semibold",
          badgeClass: "text-xs px-2 py-0.5"
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Remove any surface classes that could reintroduce a panel look
  const sanitizedClassName = useMemo(() => {
    if (!className) {return '';}
    const tokens = className.split(/\s+/).filter(Boolean);
    const filtered = tokens.filter((t) =>
      !/^bg-/.test(t) && // backgrounds
      !/^shadow/.test(t) && // shadows
      !/^border(?!-r|!-)/.test(t) // borders (keep border-right etc. if needed)
    );
    return filtered.join(' ');
  }, [className]);

  // Render content without motion during scroll to prevent flickering
  const cardContent = (
    <>
      {/* Persistent live region for announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      
      {/* Image Container */}
      <div className="relative w-full">
        <div className={cn("relative w-full rounded-[20px] overflow-hidden bg-transparent border-0 shadow-none", variantStyles.imageClass)}>
        {/* Loading Placeholder */}
        {imageLoading && (
          <div className="absolute inset-0 bg-transparent animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Next.js Image Component */}
        {heroImageUrl && (
          <Image
            src={heroImageUrl}
            alt={cardData.title || 'Product image'}
            fill
            priority={priority}
            className={cn(
              "object-cover transition-transform duration-300 opacity-100 rounded-2xl",
              "group-hover:scale-105"
            )}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
              // Only log errors in development mode to reduce console noise
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.warn(`Image failed to load: ${heroImageUrl}`);
              }
            }}
            sizes="(max-width: 768px) 45vw, 200px"
            unoptimized={false}
          />
        )}

        {/* Fallback image when hero image fails or is not available */}
        {(!heroImageUrl || imageError) && (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center rounded-2xl">
            <div className="text-gray-400 text-sm text-center px-2">
              <div className="w-8 h-8 mx-auto mb-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
              <span className="text-xs">Image unavailable</span>
            </div>
          </div>
        )}

        {/* Image Tag - exact working version */}
        {cardData.imageTag && (
          <div
            className={cardStyles['card-tag']}
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
              {cardData.imageTag}
            </span>
          </div>
        )}

        {/* Badge for specials - positioned in top left corner of image */}
        {cardData.badge && (
          <div className="absolute top-3 left-3">
            <span 
              className="absolute rounded-full shadow-md font-medium truncate text-xs px-2.5 py-1.5 max-w-[calc(100%-4rem)] text-white"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                isolation: 'isolate'
              }}
            >
              {cardData.badge}
            </span>
          </div>
        )}

        {/* Overlay Tag for specials (e.g., "Meat", "Dairy") */}
        {cardData.overlayTag && (
          <div className="absolute top-3 right-3">
            <span 
              className="absolute rounded-full shadow-md font-medium truncate text-xs px-2.5 py-1.5 max-w-[calc(100%-4rem)] text-white"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                isolation: 'isolate'
              }}
            >
              {cardData.overlayTag}
            </span>
          </div>
        )}

        {/* Heart Button - positioned relative to image wrapper */}
        {cardData.showHeart && (
          <button
            className={cn(cardStyles['card-heart'], liked && cardStyles.liked)}
            onClick={(e) => {
              e.stopPropagation();
              handleLikeToggle();
            }}
            onKeyDown={handleHeartKeyDown}
            aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={liked}
          >
            <span className="relative block w-[18px] h-[18px]">
              {/* Always use filled heart SVG with CSS controlling colors */}
              <svg 
                viewBox="0 0 24 24" 
                className="w-[18px] h-[18px]"
                aria-hidden
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.13 2.44h.74C13.09 5.01 14.76 4 16.5 4 19 4 21 6 21 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>
          </button>
        )}
        </div>
      </div>
      
      {/* Content - Enhanced hover effects */}
      <div 
        className={cn(
          "card-content flex flex-col bg-transparent w-full",
          variant === 'map' ? "pt-2 px-3 pb-2" : "pt-2 px-3 pb-3"
        )}
        style={{
          transform: isScrolling ? 'none' : undefined,
          transition: isScrolling ? 'none' : undefined,
          animation: isScrolling ? 'none' : undefined
        }}
      >
        <div className="flex justify-between items-center gap-1 mb-0 min-h-[16px] w-full">
          <h3 
            className={cn(
              variantStyles.titleClass,
              "text-sm font-semibold line-clamp-1 break-words min-w-0 text-black m-0 transition-colors duration-200 group-hover:text-gray-900"
            )}
            style={{ flex: '1 1 0%', minWidth: 0 }}
            aria-label={`Title: ${cardData.title}`}
          >
            {cardData.title ? cardData.title.substring(0, 11) + (cardData.title.length > 11 ? '...' : '') : ''}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            {cardData.timeLeftSeconds !== undefined && (
              <>
                <Clock className="h-3 w-3" />
                <span>{timeLeftLabel}</span>
              </>
            )}
            {!cardData.timeLeftSeconds && cardData.additionalText && (
              <span>{cardData.additionalText}</span>
            )}
            {/* Only show badge in title area if it's not a specials card (badge is on image for specials) */}
            {cardData.badge && !cardData.price && (
              <div
                className={cn(
                  "flex items-center bg-transparent text-gray-700 font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 group-hover:bg-transparent",
                  variantStyles.badgeClass
                )}
                style={{
                  transform: isScrolling ? 'none' : undefined,
                  transition: isScrolling ? 'none' : undefined,
                  animation: isScrolling ? 'none' : undefined,
                  flexShrink: 0,
                  margin: 0,
                  padding: 0
                }}
                aria-label={`Rating: ${cardData.badge}`}
              >
                {showStarInBadge && (
                  <Star size={12} className="fill-yellow-400 text-yellow-400 flex-shrink-0 mr-0.5" />
                )}
                <span className="leading-none">{cardData.badge}</span>
              </div>
            )}
          </div>
        </div>

        {/* Specials-specific content */}
        {cardData.price && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {/* Show discount-based pricing for specials */}
              {discountInfo ? (
                <span className="font-semibold text-green-600 text-sm">{discountLabel}</span>
              ) : (
                <>
                  {salePrice && (
                    <span className="font-semibold text-green-600 text-sm">{salePrice}</span>
                  )}
                  {originalPrice && originalPrice !== salePrice && (
                    <span className="text-xs text-gray-500 line-through">{originalPrice}</span>
                  )}
                </>
              )}
            </div>
            {cardData.ctaText && (
              <span className="text-xs font-semibold text-green-600">
                {cardData.ctaText}
              </span>
            )}
          </div>
        )}

      </div>
    </>
  );

  // Always render a single motion.div to avoid remounts during scroll
  return (
    <motion.div
      variants={cardVariants}
      initial={false}
      animate={isScrolling ? 'scroll' : 'visible'}
      exit="exit"
      // Disable hover lift to avoid layout/compositing thrash in dense grids
      whileHover={undefined}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
      className={cn(
        'relative bg-transparent cursor-pointer group card',
        'transition-all duration-200 ease-out',
        'h-full flex flex-col',
        'border-0',
        'shadow-none',
        variantStyles.cardClass,
        sanitizedClassName
      )}
      style={{ 
        paddingBottom: 0, 
        margin: 0, 
        boxShadow: 'none',
        // Keep styles minimal to avoid layer thrash
        backfaceVisibility: 'hidden',
        willChange: isScrolling ? 'auto' : 'transform'
      }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${cardData.title}`}
      aria-live="polite"
      aria-describedby={`card-${cardData.id.toString()}`}
    >
      {cardContent}
    </motion.div>
  );
});

Card.displayName = 'Card';

export default Card;
