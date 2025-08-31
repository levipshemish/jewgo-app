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
import styles from './UnifiedCard.module.css';

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
      {/* Global styles for transparent surface, tag pill, and heart icon */}
      <style jsx global>{`
        .unified-card {
          background: transparent !important;
          box-shadow: none !important;
          border: 0 !important;
        }
        .unified-card *, .unified-card > div {
          background: transparent !important;
        }

        /* Tag pill (theme-aware glass) */
        .unified-card-tag {
          position: absolute !important;
          top: 8px !important;
          left: 8px !important;
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
          background-color: rgba(17, 24, 39, 0.70) !important; /* slate-900 at 70% */
          color: #ffffff !important;
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
          background-color: rgba(17, 24, 39, 0.85) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
          transform: translateY(-1px) !important;
        }
        .unified-card-tag { cursor: pointer !important; }
        .unified-card-tag:active { transform: translateY(0px) !important; opacity: 1 !important; }
        @media (prefers-color-scheme: dark) {
          .unified-card-tag {
            background-color: rgba(255, 255, 255, 0.14) !important;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.22) !important;
            backdrop-filter: blur(8px) !important;
          }
          .unified-card-tag:hover {
            background-color: rgba(255, 255, 255, 0.22) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
          }
        }

        /* Heart button and Lucide icon path fill */
        .unified-card-heart {
          position: absolute !important;
          top: 4px !important;
          right: 8px !important;
          width: 28px !important;
          max-width: 28px !important;
          min-width: 28px !important;
          height: 28px !important;
          max-height: 28px !important;
          min-height: 28px !important;
          background-color: transparent !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: none !important;
          min-height: 28px !important;
          min-width: 28px !important;
          padding: 0 !important;
          cursor: pointer !important;
          -webkit-tap-highlight-color: transparent !important;
          touch-action: manipulation !important;
          z-index: 10 !important;
          transition: all 0.2s ease-out !important;
        }
        .unified-card-heart:hover { transform: scale(1.1) !important; }
        .unified-card-heart:active { transform: scale(0.95) !important; opacity: 1 !important; }
        .unified-card-heart svg {
          width: 18px !important;
          height: 18px !important;
          transition: all 0.2s ease-out !important;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) !important;
        }
        /* Heart color control - light grey fill by default */
        .unified-card-heart svg {
          color: rgb(156, 163, 175) !important; /* light grey for default state */
          fill: rgb(156, 163, 175) !important; /* light grey fill for default state */
          stroke: #ffffff !important; /* white outline */
          stroke-width: 1.5px !important;
        }
        .unified-card-heart:hover svg {
          color: rgb(239, 68, 68) !important; /* red on hover */
          fill: rgb(239, 68, 68) !important; /* red fill on hover */
          stroke: #ffffff !important; /* keep white outline */
        }
        .unified-card-heart.liked svg {
          color: rgb(239, 68, 68) !important; /* red when liked */
          fill: rgb(239, 68, 68) !important; /* red fill when liked */
          stroke: #ffffff !important; /* keep white outline */
        }
      `}</style>
      {/* Persistent live region for announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      
      {/* Image Container */}
      <div className="relative w-full">
        <div className="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden bg-transparent border-0 shadow-none">
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
            className={cn(
              "object-cover transition-transform duration-300 opacity-100 rounded-2xl",
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
      
      {/* Content - Enhanced hover effects */}
      <div 
        className="unified-card-content pt-2 flex flex-col bg-transparent"
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
              "text-sm font-semibold line-clamp-1 break-words min-w-0 text-black m-0 flex-1 transition-colors duration-200 group-hover:text-gray-900"
            )}
            aria-label={`Title: ${cardData.title}`}
          >
            {cardData.title}
          </h3>
          {cardData.badge && (
            <div
              className={cn(
                "inline-flex items-center gap-1 bg-transparent text-gray-700 rounded-lg font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 group-hover:bg-transparent group-hover:shadow-sm ml-auto",
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
                <Star size={12} className="fill-yellow-400 text-yellow-400 flex-shrink-0" style={{ marginTop: '-1px' }} />
              )}
              <span className="leading-none" style={{ marginTop: '1px' }}>{cardData.badge}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-xs text-muted-foreground line-clamp-1 flex-1 min-w-0">
            {cardData.subtitle || ''}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-1 ml-2 flex-shrink-0">
            {cardData.additionalText || ''}
          </p>
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
          willChange: 'auto',
          paddingBottom: 0,
          margin: 0
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
      style={{ paddingBottom: 0, margin: 0, boxShadow: 'none' }}
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
}));

UnifiedCard.displayName = 'UnifiedCard';

export default UnifiedCard;
