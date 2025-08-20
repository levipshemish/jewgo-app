'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils/classNames';
import { useFavorites } from '@/lib/utils/favorites';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';

// TypeScript Interfaces (keeping original)
interface CardData {
  id: string;
  imageUrl?: string;
  imageTag?: string;
  imageTagLink?: string;
  title: string;
  badge?: string;
  subtitle?: string;
  additionalText?: string;
  showHeart?: boolean;
  isLiked?: boolean;
}

interface EnhancedProductCardProps {
  data: CardData;
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCardClick?: (data: CardData) => void;
  onTagClick?: (tagLink: string, event: React.MouseEvent) => void;
  className?: string;
  priority?: boolean;
}



// Motion variants for animations
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0
  },
  hover: {
    y: -8,
    scale: 1.02
  }
};

const heartVariants = {
  idle: { scale: 1 },
  hover: { 
    scale: 1.1
  },
  tap: { 
    scale: 1.2
  }
};

const tagVariants = {
  idle: { scale: 1 },
  hover: { 
    scale: 1.05
  },
  tap: { 
    scale: 0.98
  }
};

// Main Enhanced Product Card Component
const EnhancedProductCard = memo<EnhancedProductCardProps>(({
  data,
  onLikeToggle,
  onCardClick,
  onTagClick,
  className = '',
  priority = false
}) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { handleImmediateTouch } = useMobileTouch();
  
  // State management
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Sync with favorites manager
  useEffect(() => {
    setIsLiked(isFavorite(data.id));
  }, [isFavorite, data.id]);

  // Memoized computations
  const cardData = useMemo(() => ({
    ...data,
    imageTag: data.imageTag || '',
    imageTagLink: data.imageTagLink || '',
    badge: data.badge || '',
    subtitle: data.subtitle || '',
    additionalText: data.additionalText || '',
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

  // Handlers
  const handleLikeToggle = useCallback(() => {
    if (isAnimating) {
      return;
    }
    
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);

    try {
      const newIsLiked = !isLiked;
      
      if (newIsLiked) {
        // Create a minimal restaurant object with required fields
        const minimalRestaurant = {
          id: data.id,
          name: data.title,
          address: '',
          city: '',
          state: '',
          zip_code: '',
          phone_number: '',
          kosher_category: 'unknown' as any,
          certifying_agency: '',
          listing_type: 'restaurant',
          status: 'active' as any,
          hours: {} as any,
          category: 'restaurant' as any
        };
        addFavorite(minimalRestaurant);
      } else {
        removeFavorite(data.id);
      }
      
      setIsLiked(newIsLiked);
      onLikeToggle?.(data.id, newIsLiked);
      
      // Announce to screen readers using persistent live region
      const message = newIsLiked ? 'Added to favorites' : 'Removed from favorites';
      setAnnouncement(message);
      // Clear the announcement after screen readers have processed it
      setTimeout(() => setAnnouncement(''), 1000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Card error:', error);
    }
  }, [isLiked, isAnimating, data.id, data.title, onLikeToggle, addFavorite, removeFavorite]);

  const handleCardClick = handleImmediateTouch(() => {
    if (onCardClick) {
      onCardClick(cardData);
    }
  });

  const handleTagClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (cardData.imageTagLink && onTagClick) {
      onTagClick(cardData.imageTagLink, event);
    } else if (cardData.imageTagLink && typeof window !== 'undefined') {
      // Default behavior - open link in new tab
      window.open(cardData.imageTagLink, '_blank', 'noopener,noreferrer');
    }
  }, [cardData.imageTagLink, onTagClick]);

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

  const handleTagKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTagClick(event as any);
    }
  }, [handleTagClick]);

  return (
    <motion.div
      className={cn(
        "w-[160px] bg-white rounded-2xl overflow-hidden shadow-lg p-3",
        "hover:shadow-2xl transition-shadow duration-300",
        "mx-auto",
        onCardClick ? "cursor-pointer" : "",
        className
      )}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      role={onCardClick ? "button" : "article"}
      aria-label={`Product card for ${cardData.title}`}
      tabIndex={onCardClick ? 0 : -1}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
    >
      {/* Persistent live region for announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      {/* Image Container */}
      <div className="relative w-full">
        <div className="w-full h-[112px] rounded-[20px] overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
          {/* Loading Placeholder */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center rounded-[20px]">
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
                "object-cover transition-opacity duration-300 rounded-[20px]",
                imageLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              sizes="160px"
              unoptimized={heroImageUrl.includes('cloudinary.com')}
              priority={priority}
            />
          )}


        </div>
        
        {/* Image Tag */}
        <AnimatePresence>
          {cardData.imageTag && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              {cardData.imageTagLink ? (
                <motion.div
                  className="absolute top-2 left-2 bg-white/95 text-gray-900 rounded-full font-medium cursor-pointer hover:bg-white shadow-sm flex items-center justify-center"
                  style={{
                    width: '60px',
                    maxWidth: '60px',
                    minWidth: '60px',
                    height: '24px',           // Fixed height prevents vertical expansion
                    overflow: 'hidden',
                    padding: '0',             // Remove Tailwind padding, use custom
                    paddingLeft: '8px',       // Explicit padding for consistency
                    paddingRight: '8px',
                    fontSize: '12px',         // Explicit font size instead of text-xs
                    lineHeight: '1',          // Fixed line height
                    fontWeight: '500',        // Explicit font weight
                    WebkitFontSmoothing: 'antialiased',  // Consistent font rendering
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                    // Prevent mobile browser scaling
                    WebkitTextSizeAdjust: '100%',
                    MozTextSizeAdjust: '100%',
                    msTextSizeAdjust: '100%'
                  }}
                  variants={tagVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleTagClick}
                  onKeyDown={handleTagKeyDown}
                  role="button"
                  tabIndex={0}
                  aria-label={`${cardData.imageTag} tag - click to open link`}
                >
                  <span 
                    style={{
                      display: 'block',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      maxWidth: '44px',        // Account for padding (60px - 16px padding)
                      fontSize: 'inherit',     // Inherit from parent
                      lineHeight: 'inherit',
                      fontWeight: 'inherit'
                    }}
                  >
                    {cardData.imageTag}
                  </span>
                </motion.div>
              ) : (
                <div 
                  className="absolute top-2 left-2 bg-white/95 text-gray-900 rounded-full font-medium flex items-center justify-center shadow-sm"
                  style={{
                    width: '60px',
                    maxWidth: '60px',
                    minWidth: '60px',
                    height: '24px',           // Fixed height
                    overflow: 'hidden',
                    padding: '0',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    fontSize: '12px',
                    lineHeight: '1',
                    fontWeight: '500',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                    // Prevent mobile browser scaling
                    WebkitTextSizeAdjust: '100%',
                    MozTextSizeAdjust: '100%',
                    msTextSizeAdjust: '100%'
                  }}
                  aria-label={`Tag: ${cardData.imageTag}`}
                >
                  <span 
                    style={{
                      display: 'block',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      maxWidth: '44px',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                      fontWeight: 'inherit'
                    }}
                  >
                    {cardData.imageTag}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Heart Button */}
        <AnimatePresence>
          {cardData.showHeart && (
            <motion.button
              className={cn(
                "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                "shadow-lg transition-colors duration-200 group",
                isLiked ? 'bg-white' : 'bg-white/90 hover:bg-white'
              )}
              variants={heartVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              animate={isAnimating ? "tap" : "idle"}
              onClick={(e) => {
                e.stopPropagation();
                handleLikeToggle();
              }}
              onKeyDown={handleHeartKeyDown}
              aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isLiked}
              style={{
                minHeight: '16px',
                minWidth: '16px',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                zIndex: 10
              }}
            >
              <Heart
                size={13}
                className={cn(
                  "transition-all duration-200",
                  isLiked 
                    ? 'fill-red-500 stroke-red-500' 
                    : 'fill-none stroke-gray-400 group-hover:fill-red-500 group-hover:stroke-red-500'
                )}
                strokeWidth={2}
              />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      
      {/* Content */}
      <motion.div 
        className="pt-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex justify-between items-start gap-2 mb-1 min-h-[20px]">
          <h3 
            className="text-sm font-semibold text-gray-800 m-0 flex-1 truncate min-w-0"
            aria-label={`Title: ${cardData.title}`}
          >
            {cardData.title}
          </h3>
          {cardData.badge && (
            <motion.div
              className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.2 }}
              aria-label={`Rating: ${cardData.badge}`}
            >
              {cardData.badge}
            </motion.div>
          )}
        </div>
        
        <div className="flex justify-between items-center gap-3 min-h-[16px]">
          {cardData.subtitle && (
            <p 
              className="text-xs text-gray-600 m-0 flex-1 truncate min-w-0"
              style={{ 
                maxWidth: '80px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              aria-label={`Price range: ${cardData.subtitle}`}
            >
              {cardData.subtitle}
            </p>
          )}
          {cardData.additionalText && (
            <p 
              className="text-xs text-gray-500 m-0 text-right whitespace-nowrap flex-shrink-0 truncate"
              style={{ 
                maxWidth: '50px',
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
      </motion.div>
    </motion.div>
  );
});

EnhancedProductCard.displayName = 'EnhancedProductCard';

export default EnhancedProductCard;
