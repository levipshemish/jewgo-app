/**
 * Shared Card Utilities
 * ====================
 * 
 * Common functions used across different card components to reduce duplication
 * and maintain consistency.
 */

import { cn } from './classNames';

/**
 * Format price from cents to currency string
 */
export const formatPrice = (priceCents: number, currency: string = 'USD'): string => {
  if (priceCents === 0) {
    return 'Free';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(priceCents / 100);
};

/**
 * Format price range for restaurants
 */
export const formatPriceRange = (priceRange?: string, minCost?: number, maxCost?: number): string => {
  if (priceRange && priceRange.trim() !== '') {
    // If price_range is in format "10-35", add $ symbol
    if (priceRange.includes('-')) {
      return `$${priceRange}`;
    }
    // If it's already a dollar amount format, return as is
    if (priceRange.startsWith('$')) {
      return priceRange;
    }
    // If it's just numbers, assume it's a price range and add $
    if (/^\d+$/.test(priceRange)) {
      return `$${priceRange}`;
    }
    return priceRange;
  }
  
  if (minCost && maxCost) {
    return `$${minCost}-${maxCost}`;
  }
  
  return '$$';
};

/**
 * Convert price range to dollar signs ($ to $$$$)
 */
export const formatPriceDollarSigns = (priceRange?: string, minCost?: number, maxCost?: number): string => {
  // Extract numeric values from price range
  let avgPrice = 0;
  
  if (priceRange && priceRange.trim() !== '') {
    const matches = priceRange.match(/\$?(\d+)(?:-\$?(\d+))?/);
    if (matches) {
      const min = parseInt(matches[1], 10);
      const max = matches[2] ? parseInt(matches[2], 10) : min;
      avgPrice = (min + max) / 2;
    }
  } else if (minCost && maxCost) {
    avgPrice = (minCost + maxCost) / 2;
  }
  
  // Convert to dollar signs based on average price
  if (avgPrice === 0) return '$$';
  if (avgPrice < 15) return '$';
  if (avgPrice < 30) return '$$';
  if (avgPrice < 50) return '$$$';
  return '$$$$';
};

/**
 * Format time ago from date string
 */
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  }
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  }
  if (diffInSeconds < 2592000) {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  return date.toLocaleDateString();
};

/**
 * Convert string to title case
 */
export const titleCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Get listing type icon emoji
 */
export const getListingTypeIcon = (type: string): string => {
  switch (type) {
    case 'sale':
      return '💰';
    case 'free':
      return '🎁';
    case 'borrow':
      return '📚';
    case 'gemach':
      return '🤝';
    default:
      return '🛍️';
  }
};

/**
 * Get listing type color classes
 */
export const getListingTypeColor = (type: string): string => {
  switch (type) {
    case 'sale':
      return 'bg-green-100 text-green-800';
    case 'free':
      return 'bg-blue-100 text-blue-800';
    case 'borrow':
      return 'bg-purple-100 text-purple-800';
    case 'gemach':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get condition color classes
 */
export const getConditionColor = (condition?: string): string => {
  switch (condition) {
    case 'new':
      return 'bg-green-100 text-green-800';
    case 'used_like_new':
      return 'bg-blue-100 text-blue-800';
    case 'used_good':
      return 'bg-yellow-100 text-yellow-800';
    case 'used_fair':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get safe image URL with fallback
 */
export const getSafeImageUrl = (imageUrl?: string, fallback?: string): string => {
  if (!imageUrl) {
    return fallback || '/images/default-placeholder.webp';
  }
  
  // Basic URL validation
  try {
    new URL(imageUrl);
    return imageUrl;
  } catch {
    return fallback || '/images/default-placeholder.webp';
  }
};

/**
 * Get hero image with fallback logic
 */
export const getHeroImage = (
  images?: string[], 
  thumbnail?: string, 
  fallbackIcon?: string,
  imageError: boolean = false
): string => {
  if (imageError) {
    return fallbackIcon || '🍽️';
  }
  
  const imageUrl = images?.[0] || thumbnail;
  if (!imageUrl) {
    return fallbackIcon || '🍽️';
  }
  
  return imageUrl;
};

/**
 * Standard card styling classes
 */
export const cardStyles = {
  base: 'bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer',
  compact: 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer',
  marketplace: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group',
  eatery: 'w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation restaurant-card flex flex-col',
  
  // Image containers
  imageContainer: {
    default: 'relative aspect-[5/4] overflow-hidden rounded-t-xl',
    square: 'relative aspect-square overflow-hidden rounded-t-xl',
    restaurant: 'relative aspect-[3/4] bg-gray-100 overflow-hidden rounded-t-xl',
  },
  
  // Content containers
  content: {
    default: 'p-3 sm:p-4',
    compact: 'p-2 sm:p-3',
    marketplace: 'p-1.5',
  },
  
  // Badge positioning
  badge: {
    topLeft: 'absolute top-2 left-2',
    topRight: 'absolute top-2 right-2',
    bottomLeft: 'absolute bottom-2 left-2',
    bottomRight: 'absolute bottom-2 right-2',
  },
  
  // Button positioning
  button: {
    topRight: 'absolute top-2 right-2',
    topLeft: 'absolute top-2 left-2',
  },
};

/**
 * Get card styling based on type and variant
 */
export const getCardStyles = (
  type: 'restaurant' | 'marketplace' | 'eatery' = 'restaurant',
  variant: 'default' | 'compact' | 'featured' = 'default'
): string => {
  const baseStyle = type === 'marketplace' ? cardStyles.marketplace : cardStyles.base;
  
  if (variant === 'compact') {
    return cn(baseStyle, 'scale-95');
  }
  
  if (variant === 'featured') {
    return cn(baseStyle, 'ring-2 ring-blue-200');
  }
  
  return baseStyle;
};

/**
 * Standard image loading states
 */
export const imageStates = {
  loading: 'animate-pulse bg-gray-200',
  error: 'bg-gray-100 flex items-center justify-center',
  success: 'opacity-100',
  initial: 'opacity-0',
};

/**
 * Get image state classes
 */
export const getImageStateClasses = (loading: boolean, error: boolean): string => {
  if (loading) {return imageStates.loading;}
  if (error) {return imageStates.error;}
  return imageStates.success;
};
