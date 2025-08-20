'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
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
  lazy?: boolean;
  priority?: boolean;
}

// Error Boundary Hook
const useErrorBoundary = () => {
  const [hasError, setHasError] = useState(false);
  const resetError = useCallback(() => setHasError(false), []);
  
  const catchError = useCallback((error: Error) => {
    console.warn('Card warning:', error);
    // Just log errors, don't break the UI
  }, []);

  return { hasError: false, resetError, catchError };
};

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
  lazy = true,
  priority = false
}) => {
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { handleImmediateTouch } = useMobileTouch();
  const { catchError } = useErrorBoundary();
  
  // State management
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync with favorites manager
  useEffect(() => {
    setIsLiked(isFavorite(Number(data.id)));
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
    if (!cardData.imageUrl) return null;
    
    let safeUrl = getSafeImageUrl(cardData.imageUrl);
    
    // Normalize known broken Cloudinary URLs
    safeUrl = safeUrl.replace(/\/image_1\.(jpg|jpeg|png|webp|avif)$/i, '/image_1');
    
    // If we get back the default image or there's an error, use placeholder
    if (safeUrl === '/images/default-restaurant.webp' || imageError) {
      return '/images/default-restaurant.webp';
    }
    
    // Add Cloudinary optimization parameters if missing
    if (safeUrl.includes('cloudinary.com') && !safeUrl.includes('/f_auto,q_auto/')) {
      safeUrl = safeUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
    }
    
    return safeUrl;
  }, [cardData.imageUrl, imageError]);

  // Handlers
  const handleLikeToggle = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);

    try {
      const newIsLiked = !isLiked;
      
      if (newIsLiked) {
        // Create a minimal restaurant object with required fields
        const minimalRestaurant = {
          id: Number(data.id),
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
        removeFavorite(Number(data.id));
      }
      
      setIsLiked(newIsLiked);
      onLikeToggle?.(data.id, newIsLiked);
      
      // Announce to screen readers
      const message = newIsLiked ? 'Added to favorites' : 'Removed from favorites';
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (error) {
      catchError(error as Error);
    }
  }, [isLiked, isAnimating, data.id, data.title, onLikeToggle, addFavorite, removeFavorite, catchError]);

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
    } else if (cardData.imageTagLink) {
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
        "w-[200px] bg-white rounded-2xl overflow-hidden shadow-lg p-3 cursor-pointer",
        "md:hover:shadow-2xl transition-shadow duration-300",
        "max-md:w-[200px] max-md:mx-auto",
        "max-sm:w-[200px] max-sm:p-3",
        "xl:w-[200px]",
        className
      )}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      role="article"
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
      {/* Image Container */}
      <div className="relative w-full">
        <div className="w-full h-[140px] rounded-[20px] overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
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
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              unoptimized={heroImageUrl.includes('cloudinary.com')}
              priority={priority}
              quality={85}
            />
          )}

          {/* Fallback for Image Errors */}
          {imageError && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-[20px]">
              <div className="text-center">
                <div className="text-gray-400 text-2xl mb-2">🍽️</div>
                <div className="text-gray-500 text-xs font-medium truncate px-2">
                  {cardData.title}
                </div>
              </div>
            </div>
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
                  className="absolute top-2 left-2 bg-black/75 text-white px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer hover:bg-black/85"
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
                  {cardData.imageTag}
                </motion.div>
              ) : (
                <div 
                  className="absolute top-2 left-2 bg-black/75 text-white px-3 py-1.5 rounded-full text-sm font-medium"
                  aria-label={`Tag: ${cardData.imageTag}`}
                >
                  {cardData.imageTag}
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
                "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center",
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
              type="button"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                minHeight: '32px',
                minWidth: '32px',
                zIndex: 10
              }}
            >
              <motion.div
                animate={{ 
                  scale: isLiked ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  size={16}
                  className={cn(
                    "transition-all duration-200 -translate-y-px",
                    isLiked 
                      ? 'fill-red-500 stroke-red-500' 
                      : 'fill-none stroke-gray-400 group-hover:fill-red-500 group-hover:stroke-red-500'
                  )}
                  strokeWidth={2}
                />
              </motion.div>
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
            className="text-sm max-sm:text-xs font-semibold text-gray-800 m-0 flex-1 truncate min-w-0"
            aria-label={`Title: ${cardData.title}`}
          >
            {cardData.title}
          </h3>
          {cardData.badge && (
            <motion.div
              className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 max-sm:px-1.5 max-sm:py-0.5 rounded-lg text-xs max-sm:text-[10px] font-medium whitespace-nowrap flex-shrink-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.2 }}
              aria-label={`Rating: ${cardData.badge}`}
            >
              {cardData.badge}
            </motion.div>
          )}
        </div>
        
        <div className="flex justify-between items-center gap-2 min-h-[16px]">
          {cardData.subtitle && (
            <p 
              className="text-xs text-gray-600 m-0 flex-1 truncate min-w-0 max-w-[60%]"
              aria-label={`Price range: ${cardData.subtitle}`}
            >
              {cardData.subtitle}
            </p>
          )}
          {cardData.additionalText && (
            <p 
              className="text-[10px] text-gray-500 m-0 text-right whitespace-nowrap flex-shrink-0 max-w-[35%] truncate"
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
