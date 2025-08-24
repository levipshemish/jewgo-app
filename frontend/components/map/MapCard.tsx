'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { appLogger } from '@/lib/utils/logger';
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
  address?: string;
  certifyingAgency?: string;
}

interface MapCardProps {
  data: CardData;
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCardClick?: (data: CardData) => void;
  className?: string;
  priority?: boolean;
  showStarInBadge?: boolean;
}

// Motion variants for animations
const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const }
  },
  exit: { opacity: 1, y: 0 }
};

// Map-specific Card Component (based on UnifiedCard but optimized for map popups)
const MapCard = memo<MapCardProps>(({
  data,
  onLikeToggle,
  onCardClick,
  className = '',
  priority = false,
  showStarInBadge = false
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
          id: data.id.toString(),
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
        removeFavorite(data.id.toString());
        setAnnouncement(`Removed ${data.title} from favorites`);
      }
      
      onLikeToggle?.(data.id.toString(), newIsLiked);
      
      // Reset animation state
      setTimeout(() => setIsAnimating(false), 150);
    } catch (error) {
      appLogger.warn('Error toggling favorite', { error });
      setIsAnimating(false);
    }
  }, [liked, data, addFavorite, removeFavorite, onLikeToggle]);

  const handleCardClick = useMemo(() => (
    handleImmediateTouch(() => {
      if (isAnimating) { return; }
      onCardClick?.(cardData);
    })
  ), [handleImmediateTouch, isAnimating, onCardClick, cardData]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  // Get kosher category color for the tag
  const getKosherCategoryColor = () => {
    const category = cardData.kosherCategory?.toLowerCase();
    switch (category) {
      case 'meat':
        return 'bg-red-500 text-white';
      case 'dairy':
        return 'bg-blue-500 text-white';
      case 'pareve':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        // Map-specific styling: white background, rectangular shape
        'relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden',
        'w-full border border-gray-100',
        // Very narrow aspect ratio for map popups
        'aspect-[5/4]', // 1.25:1 ratio (very narrow)
        className
      )}
      onClick={handleCardClick}
      style={{
        backgroundColor: 'white', // Force white background
        minHeight: '150px', // 25% smaller (was 200px)
        maxHeight: '180px'  // 25% smaller (was 240px)
      }}
    >
      {/* Announcement for screen readers */}
      {announcement && (
        <div className="sr-only" role="status" aria-live="polite">
          {announcement}
        </div>
      )}

      {/* Vertical Layout: Image Top, Content Below */}
      <div className="flex flex-col h-full">
        
        {/* Image Section - Top */}
        <div className="relative h-24 bg-gray-100 overflow-hidden">
          {heroImageUrl && (
            <Image
              src={heroImageUrl}
              alt={cardData.title}
              fill
              className={cn(
                'object-cover transition-opacity duration-300',
                imageLoading ? 'opacity-0' : 'opacity-100'
              )}
              priority={priority}
              onLoad={handleImageLoad}
              onError={handleImageError}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}

          {/* Loading skeleton */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}

          {/* Kosher Category Tag */}
          {cardData.imageTag && (
            <div className="absolute bottom-2 left-2">
              <span className={cn(
                'text-xs px-2 py-1 rounded-full font-medium shadow-sm',
                getKosherCategoryColor()
              )}>
                {cardData.imageTag.charAt(0).toUpperCase() + cardData.imageTag.slice(1)}
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
              className={cn(
                'absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm backdrop-blur-sm',
                liked
                  ? 'bg-red-100/90 text-red-500 hover:bg-red-200/90'
                  : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500',
                isAnimating && 'scale-90'
              )}
              aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className={cn(
                  'w-4 h-4 transition-all duration-150',
                  liked ? 'fill-current' : 'fill-none'
                )}
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
        </div>

        {/* Content Section - Bottom */}
        <div className="flex-1 p-3">
          
          {/* Header: Title and Rating */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 flex-1 pr-2">
              {cardData.title}
            </h3>
            
            {/* Rating Badge */}
            {cardData.badge && (
              <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex-shrink-0">
                {showStarInBadge && <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />}
                <span className="text-xs font-medium">{cardData.badge}</span>
              </div>
            )}
          </div>

          {/* Restaurant Details Grid */}
          <div className="grid grid-cols-2 gap-1 text-xs">
            
            {/* Left Column */}
            <div className="space-y-0.5">
              {/* Price Range */}
              {cardData.subtitle && (
                <p className="text-gray-600 font-medium">
                  💰 {cardData.subtitle}
                </p>
              )}
              
              {/* Distance */}
              {cardData.additionalText && (
                <p className="text-green-600 font-medium">
                  🚶 {cardData.additionalText} away
                </p>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-0.5">
              {/* Address/Location */}
              {cardData.city && (
                <p className="text-gray-500 line-clamp-2 text-xs">
                  📍 {cardData.city}
                </p>
              )}

              {/* Certifying Agency */}
              {cardData.certifyingAgency && (
                <p className="text-blue-600 font-medium text-xs">
                  🏛️ {cardData.certifyingAgency}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

MapCard.displayName = 'MapCard';

export default MapCard;
