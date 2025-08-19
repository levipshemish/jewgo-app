'use client';

import { motion } from 'framer-motion';
import { Heart, Star, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { titleCase } from '@/lib/utils/stringUtils';
import { cn } from '@/lib/utils/classNames';

// Common card data interface
export interface CardData {
  id: string | number;
  name: string;
  description?: string;
  image_url?: string;
  images?: string[];
  thumbnail?: string;
  rating?: number;
  star_rating?: number;
  google_rating?: number;
  price_range?: string;
  min_avg_meal_cost?: number;
  max_avg_meal_cost?: number;
  price?: number;
  currency?: string;
  location?: string;
  address?: string;
  kosher_category?: string;
  listing_type?: string;
  [key: string]: any; // Allow additional properties
}

// Common card props interface
export interface UnifiedCardProps {
  data: CardData;
  variant?: 'default' | 'compact' | 'featured';
  type?: 'restaurant' | 'product' | 'marketplace';
  onAddToCart?: (data: CardData) => void;
  onAddToWishlist?: (data: CardData) => void;
  onFavoriteClick?: (data: CardData) => void;
  className?: string;
  showDetails?: boolean;
  isFavorite?: boolean;
  defaultImage?: string;
  routePrefix?: string;
}

// Shared card component
export const UnifiedCard: React.FC<UnifiedCardProps> = ({
  data,
  variant = 'default',
  type = 'restaurant',
  onAddToCart,
  onAddToWishlist,
  onFavoriteClick,
  className = '',
  showDetails = false,
  isFavorite: externalIsFavorite,
  defaultImage,
  routePrefix
}) => {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const { handleImmediateTouch, isMobile } = useMobileTouch();
  
  const isMobileDevice = isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);

  // Sync with external favorite state
  useEffect(() => {
    if (externalIsFavorite !== undefined) {
      setIsFavorited(externalIsFavorite);
    }
  }, [externalIsFavorite]);

  const handleCardClick = handleImmediateTouch(() => {
    const route = routePrefix ? `${routePrefix}/${data.id}` : `/${type}/${data.id}`;
    router.push(route);
  });

  const handleFavoriteClick = handleImmediateTouch(() => {
    setIsFavorited(!isFavorited);
    if (onFavoriteClick) {
      onFavoriteClick(data);
    }
    if (onAddToWishlist) {
      onAddToWishlist(data);
    }
  });

  // Get hero image with fallback
  const getHeroImage = () => {
    const imageUrl = data.images?.[0] || data.image_url || data.thumbnail || (data as any)?.productImage;
    if (!imageUrl || imageError) {
      return defaultImage || (type === 'restaurant' ? '/images/default-restaurant.webp' : '/images/default-product.webp');
    }
    return imageUrl;
  };

  // Format price/price range
  const formatPrice = () => {
    if (type === 'product' && data.price !== undefined) {
      if (data.price === 0) {
        return 'Free';
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: data.currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(data.price);
    }

    if (data.price_range && data.price_range.trim() !== '') {
      if (data.price_range.includes('-')) {
        return `$${data.price_range}`;
      }
      return data.price_range;
    }
    
    if (data.min_avg_meal_cost && data.max_avg_meal_cost) {
      return `$${data.min_avg_meal_cost}-${data.max_avg_meal_cost}`;
    }
    
    return 'Price Range: $';
  };

  // Get rating
  const getRating = () => {
    const rating = data.rating || data.star_rating || data.google_rating;
    return rating && rating > 0 ? rating : 0.0;
  };

  // Get location text
  const getLocationText = () => {
    return data.location || data.address || '';
  };

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // Use regular divs on mobile to avoid framer-motion conflicts
  const CardContainer = isMobileDevice ? 'div' : motion.div;
  const ButtonContainer = isMobileDevice ? 'button' : motion.button;
  const SpanContainer = isMobileDevice ? 'span' : motion.span;
  const heroSrc = getHeroImage();

  const cardClasses = cn(
    "w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation",
    className
  );

  const motionProps = isMobileDevice ? {} : {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 },
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  };

  return (
    <CardContainer
      onClick={handleCardClick}
      className={cardClasses}
      data-clickable="true"
      {...motionProps}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(e as any);
        }
      }}
    >
      <div className="relative bg-white rounded-xl shadow-lg hover:shadow-xl overflow-hidden">
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <Image
            src={heroSrc}
            alt={data.name}
            fill
            className={cn(
              "object-cover transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {/* Favorite Button */}
          <ButtonContainer
            onClick={(e) => {
              e.stopPropagation();
              handleFavoriteClick();
            }}
            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
            {...(isMobileDevice ? {} : {
              whileHover: { scale: 1.1 },
              whileTap: { scale: 0.9 }
            })}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-colors",
                isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"
              )}
            />
          </ButtonContainer>

          {/* Rating Badge */}
          {getRating() > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
              <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
              <span className="text-xs font-medium text-gray-700">
                {getRating().toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
            {titleCase(data.name)}
          </h3>
          
          {showDetails && data.description && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {data.description}
            </p>
          )}

          {/* Location */}
          {getLocationText() && (
            <div className="flex items-center text-xs text-gray-500 mb-2">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="line-clamp-1">{getLocationText()}</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {formatPrice()}
            </span>
            
            {/* Category Badge */}
            {(data.kosher_category || data.listing_type) && (
              <SpanContainer
                className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700"
                {...(isMobileDevice ? {} : {
                  whileHover: { scale: 1.05 }
                })}
              >
                {titleCase(data.kosher_category || data.listing_type || '')}
              </SpanContainer>
            )}
          </div>
        </div>
      </div>
    </CardContainer>
  );
};

export default UnifiedCard;
