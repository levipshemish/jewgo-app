'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
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
  showStarInBadge?: boolean;
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
  showStarInBadge = false
}) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { handleImmediateTouch } = useMobileTouch();
  
  // State management
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync with favorites manager
  useEffect(() => {
    setIsLiked(isFavorite(data.id));
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

  // Get safe image URL
  const heroImageUrl = useMemo(() => {
    if (!cardData.imageUrl) {
      return null;
    }
    
    let safeUrl = getSafeImageUrl(cardData.imageUrl);
    safeUrl = safeUrl.replace(/\/image_1\.(jpg|jpeg|png|webp|avif)$/i, '/image_1');
    
    if (safeUrl === '/images/default-restaurant.webp' || imageError) {
      return '/images/default-restaurant.webp';
    }
    
    return safeUrl;
  }, [cardData.imageUrl, imageError]);

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
      } else {
        removeFavorite(data.id);
      }
      
      setIsLiked(newIsLiked);
      onLikeToggle?.(data.id, newIsLiked);
      
      setTimeout(() => setIsAnimating(false), 200);
    } catch (error) {
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

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      className={cn(
        'relative bg-white rounded-xl cursor-pointer group',
        'border border-gray-200 hover:border-gray-300',
        'transition-all duration-200 ease-out',
        'flex flex-col',
        'p-1',
        className
      )}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${cardData.title}`}
    >
      {/* Image Container */}
      <div className="relative w-full">
        <div className={cn(
          "w-full rounded-[20px] overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 transition-transform duration-300 group-hover:scale-105",
          variantStyles.imageClass
        )}>
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
        
        {/* Image Tag */}
        {cardData.imageTag && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-medium text-gray-900 shadow-sm">
            {cardData.imageTag}
          </div>
        )}
        
        {/* Heart Button */}
        {cardData.showHeart && (
          <button
            className={cn(
              "absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm",
              "flex items-center justify-center border-0 p-0 cursor-pointer",
              "transition-all duration-200 ease-out",
              "hover:scale-110 active:scale-95",
              isAnimating && "scale-90"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleLikeToggle();
            }}
            onKeyDown={handleHeartKeyDown}
            aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isLiked}
          >
            <Heart
              size={16}
              className={cn(
                "transition-all duration-200",
                isLiked 
                  ? "fill-red-500 text-red-500" 
                  : "fill-gray-400 text-gray-400 hover:fill-red-400 hover:text-red-400"
              )}
            />
          </button>
        )}
      </div>
      
      {/* Content */}
      <motion.div 
        className="pt-2 flex flex-col"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 
            className={cn(
              variantStyles.titleClass,
              "text-gray-800 m-0 flex-1 truncate min-w-0 transition-colors duration-200 group-hover:text-gray-900"
            )}
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
            >
              {showStarInBadge && (
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
              )}
              {cardData.badge}
            </motion.div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          {/* Subtitle */}
          <div className="flex-1 min-w-0">
            {cardData.subtitle && (
              <p className="text-xs font-bold text-black m-0 text-left whitespace-nowrap truncate transition-colors duration-200 group-hover:text-gray-900">
                {cardData.subtitle}
              </p>
            )}
          </div>
          
          {/* Spacer */}
          <div className="flex-shrink-0 w-3" />
          
          {/* Additional Text */}
          <div className="flex-shrink-0">
            {cardData.additionalText && (
              <p className="text-xs text-gray-500 m-0 text-right whitespace-nowrap truncate transition-colors duration-200 group-hover:text-gray-600 w-[60px]">
                {cardData.additionalText}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

UnifiedCard.displayName = 'UnifiedCard';

export default UnifiedCard;