/**
 * Image validation and fallback utilities for JewGo
 * 
 * This file provides fallback images for restaurants when their primary images are unavailable.
 * Uses real restaurant images from Cloudinary that were scraped from Google Places.
 */

// Intentionally no Cloudinary-specific configuration here to avoid unused vars

/**
 * Check if a URL is a valid Cloudinary URL
 */
export function isValidCloudinaryUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Check if it's a Cloudinary URL
  if (!url.includes('cloudinary.com')) {
    return false;
  }
  
  // Basic URL validation
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a Cloudinary URL is likely to be accessible
 * This is a heuristic check based on URL structure
 */
export function isLikelyAccessibleCloudinaryUrl(url: string): boolean {
  if (!isValidCloudinaryUrl(url)) {
    return false;
  }
  
  // Only filter out obviously broken URLs
  const obviouslyBroken = [
    url.includes('undefined'),
    url.includes('null'),
    // Don't filter out image_1 patterns as they can be valid secondary images
  ];

  return !obviouslyBroken.some(Boolean);
}

/**
 * Check if a Cloudinary URL is problematic (returns error or broken image)
 * Updated to be more comprehensive and handle specific 404 cases
 */
export function isProblematicCloudinaryUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return true;
  }
  
  // Check for common problematic patterns - be more specific
  const problematicPatterns = [
    'image/upload/v1/undefined',
    'image/upload/undefined',
    'image/upload//',
    'image/upload/v1//',
    'image/upload/v1/placeholder',
    'image/upload/placeholder',
    'image/upload/v1/default',
    'image/upload/default',
    'image/upload/v1/fallback',
    'image/upload/fallback',
    // Specific failing Cloudinary slugs reported (explicit denylist)
    'jewgo/restaurants/sobol_boca_raton/image_1',
    'jewgo/restaurants/jons_place/image_1',
    'jewgo/restaurants/kosher_bagel_cove/image_1',
    'jewgo/restaurants/mizrachis_pizza_in_hollywood/image_1',
    'jewgo/restaurants/cafe_noir/image_1',
    // Add the specific pita_xpress problematic URL
    'jewgo/restaurants/pita_xpress/image_1',
    // Add more problematic patterns as discovered
    /\/v\d+\/[^\/]+\/undefined/, // Undefined in path
    /\/v\d+\/[^\/]+\/null/, // Null in path
    // Only filter out URLs that are clearly broken, not all image_1 patterns
    // Remove the overly broad pattern that was filtering out valid secondary images
  ];
  
  return problematicPatterns.some(pattern => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    } else if (pattern instanceof RegExp) {
      return pattern.test(url);
    }
    return false;
  });
}

/**
 * Filter and validate image URLs, removing invalid ones
 */
export function filterValidImageUrls(urls: string[]): string[] {
  if (!Array.isArray(urls)) {
    return [];
  }
  
  const validUrls = urls.filter(url => {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // Skip empty or whitespace-only URLs
    if (url.trim() === '') {
      return false;
    }
    
    // Allow multiple trusted image sources
    const isCloudinary = url.includes('cloudinary.com');
    const isGooglePlaces = url.includes('googleusercontent.com');
    const isUnsplash = url.includes('unsplash.com');
    
    if (!isCloudinary && !isGooglePlaces && !isUnsplash) {
      return false;
    }

    // Apply source-specific validation
    if (isCloudinary) {
      return isLikelyAccessibleCloudinaryUrl(url) && !isProblematicCloudinaryUrl(url);
    }
    
    // Google Places and Unsplash URLs are generally reliable
    return true;
  });

  // Remove duplicate URLs using Set
  return Array.from(new Set(validUrls));
}

/**
 * Process restaurant images with validation and fallbacks
 * Updated to be more permissive
 */
export function processRestaurantImages(
  images: string[] = [], _category: string = 'restaurant', maxImages: number = 12): string[] {
  // Allow multiple trusted image sources
  const validImages = images.filter(url => {
    if (!url || typeof url !== 'string') { return false; }
    if (url.trim() === '') { return false; }
    
    // Allow multiple trusted sources
    const isCloudinary = url.includes('cloudinary.com');
    const isGooglePlaces = url.includes('googleusercontent.com');
    const isUnsplash = url.includes('unsplash.com');
    
    if (!isCloudinary && !isGooglePlaces && !isUnsplash) { return false; }
    
    // Reject obviously broken URLs
    if (url.includes('undefined') || url.includes('null')) { return false; }
    
    // Apply Cloudinary-specific validation only for Cloudinary URLs
    if (isCloudinary) {
      return !isProblematicCloudinaryUrl(url);
    }
    
    // Google Places and Unsplash URLs are generally reliable
    return true;
  });

  // Remove duplicate images using Set
  const uniqueImages = Array.from(new Set(validImages));

  // If we have at least one real image, return all valid images up to maxImages
  if (uniqueImages.length > 0) {
    return uniqueImages.slice(0, Math.max(1, maxImages));
  }

  // No real images: use a single local placeholder to avoid a carousel of duplicates
  return ['/images/default-restaurant.webp'];
}

/**
 * Get fallback images for different restaurant categories
 * Uses real restaurant images from your Cloudinary account
 * These are actual restaurants with real images scraped from Google Places
 */
export function getFallbackImages(category: string = 'restaurant'): string[] {
  // Use local, reliable placeholder to avoid remote 404s
  const localPlaceholder = '/images/default-restaurant.webp';
  const makeList = (count: number) => Array.from({ length: count }, () => localPlaceholder);

  const localImagesByCategory: Record<string, string[]> = {
    dairy: makeList(1),
    meat: makeList(1),
    pareve: makeList(1),
    restaurant: makeList(1),
  };

  const imagesForCategory = localImagesByCategory[category]
  if (Array.isArray(imagesForCategory)) {
    return imagesForCategory
  }
  return localImagesByCategory['restaurant']!
}

/**
 * Get a single fallback image for a restaurant type
 * Uses real restaurant images from your Cloudinary account
 */
export function getRestaurantFallbackImage(restaurantType: string = 'restaurant'): string {
  const fallbackImages = getFallbackImages(restaurantType);
  // Return a random image from the category
  return fallbackImages[Math.floor(Math.random() * fallbackImages.length)] || '';
}

/**
 * Get placeholder images for restaurants that don't have real images
 * These are generic food images that represent different categories
 */
export function getPlaceholderImages(): string[] {
  // Single reliable local placeholder
  return ['/images/default-restaurant.webp'];
}

/**
 * Get a single placeholder image
 */
export function getPlaceholderImage(): string {
  const placeholders = getPlaceholderImages();
  return placeholders[Math.floor(Math.random() * placeholders.length)] || '';
}
