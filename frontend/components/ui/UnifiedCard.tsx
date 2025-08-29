'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { useFavorites } from '@/lib/utils/favorites';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';
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
  kosherCategory?: string;
  city?: string;
}

interface UnifiedCardProps {
  data: CardData;
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCardClick?: (data: CardData) => void;
  className?: string;
  priority?: boolean;
  variant?: 'default' | 'minimal' | 'enhanced';
  showStarInBadge?: boolean; // New prop to control star icon in badge
  isScrolling?: boolean; // Optional external scroll state to avoid per-card listeners
}

// Motion variants for animations - optimized to prevent flickering
const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const }
  },
  // Disable animations during scroll
  scroll: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0 }
  },
  exit: { opacity: 1, y: 0 }
};

// Main Unified Card Component
const UnifiedCard = memo<UnifiedCardProps>(({
  data,
  onLikeToggle,
  onCardClick,
  className = '',
  priority = false,
  variant = 'default',
  showStarInBadge = false, // Default to false for timestamps
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
  }), [data.id, data.imageTag, data.badge, data.subtitle, data.additionalText, data.showHeart]);

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
      
    } catch (error) {
      // console.error('Error toggling favorite:', error);
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
        <div className="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden bg-transparent border-0 shadow-none">
          {/* Loading Placeholder */}
          {imageLoading && (
            <div className="absolute inset-0 bg-transparent animate-pulse flex items-center justify-center rounded-[20px]">
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
                "object-cover transition-transform duration-300 rounded-[20px] opacity-100",
                "group-hover:scale-105"
              )}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
                // Fallback to default image on error
                // eslint-disable-next-line no-console
                console.error(`Failed to load image: ${heroImageUrl}`);
              }}
              sizes="(max-width: 768px) 45vw, 200px"
              unoptimized={false}
              priority={priority}
            />
          )}

          {/* Fallback image when hero image fails or is not available */}
          {(!heroImageUrl || imageError) && (
            <div className="absolute inset-0 bg-gray-200 rounded-[20px] flex items-center justify-center">
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

          {/* Image Tag - now positioned relative to image wrapper */}
          {cardData.imageTag && (
            <div
              className="unified-card-tag"
              aria-label={`Tag: ${cardData.imageTag}`}
              style={{ zIndex: 10 }}
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

          {/* Heart Button - positioned relative to image wrapper */}
          {cardData.showHeart && (
            <button
            className={`unified-card-heart ${liked ? 'liked' : ''}`}
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
        className="unified-card-content pt-0.5 px-1 flex flex-col bg-transparent"
        style={{
          transform: isScrolling ? 'none' : undefined,
          transition: isScrolling ? 'none' : undefined,
          animation: isScrolling ? 'none' : undefined
        }}
      >
        <div className="flex justify-between items-start gap-1 mb-0 min-h-[16px]">
          <h3 
            className={cn(
              variantStyles.titleClass,
              "text-gray-800 m-0 flex-1 min-w-0 transition-colors duration-200 group-hover:text-gray-900 leading-tight"
            )}
            style={{ 
              minHeight: '16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
            aria-label={`Title: ${cardData.title}`}
          >
            {cardData.title.length > 10 ? `${cardData.title.substring(0, 10)}...` : cardData.title}
          </h3>
          {cardData.badge && (
            <div
              className={cn(
                "inline-flex items-center gap-1 bg-transparent text-gray-700 rounded-lg font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 group-hover:bg-transparent group-hover:shadow-sm",
                variantStyles.badgeClass
              )}
              style={{
                transform: isScrolling ? 'none' : undefined,
                transition: isScrolling ? 'none' : undefined,
                animation: isScrolling ? 'none' : undefined
              }}
              aria-label={`Rating: ${cardData.badge}`}
            >
              {showStarInBadge && (
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
              )}
              {cardData.badge}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center h-[10px] relative">
          {/* Subtitle - Locked to left */}
          <div className="flex-1 min-w-0">
            <p 
              className="text-xs font-bold text-black m-0 text-left whitespace-nowrap truncate transition-colors duration-200 group-hover:text-gray-900"
              style={{ 
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                opacity: cardData.subtitle ? 1 : 0
              }}
              aria-label={cardData.subtitle ? `Price range: ${cardData.subtitle}` : ''}
            >
              {cardData.subtitle || 'Placeholder'}
            </p>
          </div>
          
          {/* Spacer to ensure proper separation */}
          <div className="flex-shrink-0 w-2" />
          
          {/* Additional Text - Locked to right */}
          <div className="flex-shrink-0">
            <p 
              className="text-xs text-gray-500 m-0 text-right whitespace-nowrap truncate transition-colors duration-200 group-hover:text-gray-600"
              style={{ 
                width: '60px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                opacity: cardData.additionalText ? 1 : 0
              }}
              aria-label={cardData.additionalText ? `Additional info: ${cardData.additionalText}` : ''}
            >
              {cardData.additionalText || 'Placeholder'}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  // Use regular div during scroll to prevent flickering
  if (isScrolling) {
    return (
      <div
        className={cn(
                  'relative bg-transparent cursor-pointer group unified-card',
        'h-full flex flex-col',
          'border-0',
          'shadow-none',
          variantStyles.cardClass,
          sanitizedClassName
        )}
        style={{ 
          background: 'transparent', 
          boxShadow: 'none', 
          border: 0,
          transform: 'none',
          transition: 'none',
          animation: 'none',
          willChange: 'auto'
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
      </div>
    );
  }

  // Use motion.div when not scrolling
  return (
    <motion.div
      variants={cardVariants}
      initial={false}
      animate="visible"
      exit="exit"
      // Disable hover lift to avoid layout/compositing thrash in dense grids
      whileHover={undefined}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
      className={cn(
        'relative bg-transparent cursor-pointer group unified-card',
        'transition-all duration-200 ease-out',
        'h-full flex flex-col',
        'border-0',
        'shadow-none',
        variantStyles.cardClass,
        sanitizedClassName
      )}
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

UnifiedCard.displayName = 'UnifiedCard';

export default UnifiedCard;
