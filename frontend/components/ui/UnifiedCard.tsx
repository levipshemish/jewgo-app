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
          "w-[180px] rounded-2xl overflow-hidden p-3",
          "transition-all duration-300 ease-out",
          "mx-auto",
          "bg-transparent",
          "group", // Add group for hover effects
          onCardClick ? "cursor-pointer" : "",
          className
        )}
      style={{
        // Transparent background with enhanced shadow
        backgroundColor: 'transparent !important',
        background: 'transparent !important',
        boxShadow: '0 4px 12px -1px rgba(0, 0, 0, 0.08), 0 2px 8px -1px rgba(0, 0, 0, 0.04)',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      role={onCardClick ? "button" : "article"}
      aria-label={`Product card for ${cardData.title}`}
      tabIndex={onCardClick ? 0 : -1}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      {/* Persistent live region for announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      {/* Image Container */}
      <div className="relative w-full">
        <div className="w-full h-[126px] rounded-[20px] overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 transition-transform duration-300 group-hover:scale-105">
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
        </div>
        
        {/* Image Tag - Enhanced hover effects */}
        {cardData.imageTag && (
          <>
            <style jsx>{`
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
              onClick={handleTagClick}
              onKeyDown={handleTagKeyDown}
              tabIndex={0}
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
          </>
        )}
        
        {/* Heart Button - Enhanced hover effects */}
        {cardData.showHeart && (
          <>
            <style jsx>{`
              .unified-card-heart {
                position: absolute !important;
                top: 6px !important;
                right: 8px !important;
                width: 28px !important;
                max-width: 28px !important;
                min-width: 28px !important;
                height: 28px !important;
                max-height: 28px !important;
                min-height: 28px !important;
                background-color: rgba(255, 255, 255, 0.9) !important;
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
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
                backdrop-filter: blur(8px) !important;
              }
              .unified-card-heart:hover {
                background-color: rgba(255, 255, 255, 1) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
                transform: scale(1.1) !important;
              }
              .unified-card-heart:hover svg {
                fill: #ef4444 !important;
                stroke: #ef4444 !important;
                transform: scale(1.1) !important;
              }
              .unified-card-heart:active {
                transform: scale(0.95) !important;
                opacity: 1 !important;
              }
              .unified-card-heart svg {
                width: 18px !important;
                height: 18px !important;
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
                size={18}
                style={{
                  fill: isLiked ? '#ef4444' : 'transparent',
                  stroke: isLiked ? '#ef4444' : '#6b7280',
                  strokeWidth: 2,
                  transition: 'all 0.2s ease-out',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
                }}
              />
            </button>
          </>
        )}
      </div>
      
      {/* Content - Enhanced hover effects */}
      <motion.div 
        className="pt-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex justify-between items-start gap-2 mb-1 min-h-[20px]">
          <h3 
            className="text-sm font-semibold text-gray-800 m-0 flex-1 truncate min-w-0 transition-colors duration-200 group-hover:text-gray-900"
            aria-label={`Title: ${cardData.title}`}
          >
            {cardData.title}
          </h3>
          {cardData.badge && (
            <motion.div
              className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 group-hover:bg-gray-200 group-hover:shadow-sm"
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
              className="text-xs text-gray-600 m-0 flex-1 truncate min-w-0 transition-colors duration-200 group-hover:text-gray-700"
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
              className="text-xs text-gray-500 m-0 text-right whitespace-nowrap flex-shrink-0 truncate transition-colors duration-200 group-hover:text-gray-600"
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
