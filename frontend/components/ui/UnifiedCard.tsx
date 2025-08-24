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
  showStarInBadge = false // Default to false for timestamps
}) => {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { handleImmediateTouch } = useMobileTouch();
  const { isScrolling } = useScrollDetection({ debounceMs: 100, enableBodyClass: false });
  
  // State management
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
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
      setIsAnimating(true);
      const newIsLiked = !liked;
      
      if (newIsLiked) {
        const minimalRestaurant = {
          id: data.id.toString(), // Ensure ID is string
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
          category: { name: 'restaurant' } as any
        };
        addFavorite(minimalRestaurant);
        setAnnouncement(`Added ${data.title} to favorites`);
      } else {
        removeFavorite(data.id.toString()); // Ensure ID is string
        setAnnouncement(`Removed ${data.title} from favorites`);
      }
      
      onLikeToggle?.(data.id.toString(), newIsLiked); // Ensure ID is string
      
      // Reset animation state
      setTimeout(() => setIsAnimating(false), 200);
    } catch {
      setIsAnimating(false);
    }
  }, [liked, data.id, data.title, data.city, data.kosherCategory, onLikeToggle, addFavorite, removeFavorite]);

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
          cardClass: hasFullWidth ? "w-full rounded-2xl overflow-hidden p-2" : "w-[200px] rounded-2xl overflow-hidden p-2",
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
        <div className={cn(
          "relative w-full rounded-[20px] overflow-hidden bg-transparent transition-transform duration-300 group-hover:scale-105",
          "border-0 shadow-none", // Ensure no border or shadow
          variantStyles.imageClass
        )}>
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
                "object-cover transition-all duration-300 rounded-[20px]",
                imageLoading ? 'opacity-0' : 'opacity-100',
                "group-hover:scale-110"
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
              style={{ transform: isAnimating ? 'scale(0.9)' : 'scale(1)' }}
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
        className="pt-2 flex flex-col bg-transparent"
        style={{
          transform: isScrolling ? 'none' : undefined,
          transition: isScrolling ? 'none' : undefined,
          animation: isScrolling ? 'none' : undefined
        }}
      >
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
      </div>
    </>
  );

  // Use regular div during scroll to prevent flickering
  if (isScrolling) {
    return (
      <div
        className={cn(
          'relative bg-transparent cursor-pointer group unified-card',
          'flex flex-col',
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
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      className={cn(
        'relative bg-transparent cursor-pointer group unified-card',
        'transition-all duration-200 ease-out',
        'flex flex-col',
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
