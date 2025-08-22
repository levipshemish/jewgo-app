'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { useFavorites } from '@/lib/utils/favorites';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';
import { getKosherCategoryBadgeClasses } from '@/lib/utils/kosherCategories';

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
  variant?: 'default' | 'minimal' | 'enhanced' | 'eatery' | 'compact' | 'detailed';
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

// Card styles object
const cardStyles = {
  base: "bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300",
  compact: "bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300",
  eatery: "bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
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
    subtitle: data.subtitle || '',
    additionalText: data.additionalText || '',
    showHeart: data.showHeart !== false
  }), [data]);

  // Get safe image URL using existing utility
  const heroImageUrl = useMemo(() => {
    if (!cardData.imageUrl) {
      return null;
    }
    return getSafeImageUrl(cardData.imageUrl);
  }, [cardData.imageUrl]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const newIsLiked = !isLiked;
    
    try {
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
  }, [isLiked, data.id, data.title, data.city, data.kosherCategory, onLikeToggle, addFavorite, removeFavorite, isAnimating]);

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

  const titleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
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
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        position: 'relative',
        zIndex: 1,
        ...(isMobileDevice && {
          opacity: 1,
          transform: 'scale(1)'
        })
      }}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden">
        {heroImageUrl && !imageError ? (
          <Image
            src={heroImageUrl}
            alt={cardData.title}
            width={400}
            height={300}
            className={cn(
              "w-full object-cover transition-all duration-300",
              variantStyles.imageClass,
              imageLoading ? "blur-sm scale-110" : "blur-0 scale-100"
            )}
            priority={priority}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        ) : (
          <div className={cn(
            "bg-gray-200 flex items-center justify-center",
            variantStyles.imageClass
          )}>
            <span className="text-gray-400 text-sm">No Image</span>
          </div>
        )}

        {/* Badge */}
        {cardData.badge && (
          <div className={cn(
            "absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm",
            variantStyles.badgeClass
          )}>
            <div className="flex items-center gap-1">
              {showStarInBadge && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
              <span className="font-medium text-gray-700">
                {titleCase(cardData.badge)}
              </span>
            </div>
          </div>
        )}

        {/* Kosher Category Badge */}
        {data.kosherCategory && (
          <div className={cn(
            "absolute top-2 right-2 rounded-full px-2 py-1 shadow-sm",
            variantStyles.badgeClass,
            getKosherCategoryStyle()
          )}>
            <span className="font-medium">
              {titleCase(data.kosherCategory)}
            </span>
          </div>
        )}

        {/* Heart Button */}
        {cardData.showHeart && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLikeToggle();
            }}
            onKeyDown={handleHeartKeyDown}
            className={cn(
              "absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200",
              isLiked 
                ? "bg-red-500 text-white shadow-lg" 
                : "bg-white/90 text-gray-400 hover:text-red-500 shadow-sm"
            )}
            aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <Heart 
              className={cn(
                "w-4 h-4 transition-all duration-200",
                isLiked && "fill-current"
              )}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className={cn(
          "font-semibold text-gray-900 mb-1 line-clamp-2",
          variantStyles.titleClass
        )}>
          {cardData.title}
        </h3>
        
        {cardData.subtitle && (
          <p className="text-sm text-gray-600 mb-1 line-clamp-1">
            {cardData.subtitle}
          </p>
        )}
        
        {cardData.additionalText && (
          <p className="text-xs text-gray-500 line-clamp-1">
            {cardData.additionalText}
          </p>
        )}
      </div>

      {/* Screen Reader Announcement */}
      {announcement && (
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      )}
    </motion.div>
  );
});

UnifiedCard.displayName = 'UnifiedCard';

export default UnifiedCard;
