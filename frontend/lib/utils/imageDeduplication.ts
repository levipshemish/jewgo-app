/**
 * Image deduplication utilities for JewGo
 * Provides functions to remove duplicate images from arrays
 */

/**
 * Remove duplicate image URLs from an array
 * @param images Array of image URLs
 * @returns Array of unique image URLs
 */
export function deduplicateImages(images: string[]): string[] {
  if (!Array.isArray(images)) {
    return [];
  }

  // Filter out falsy values and remove duplicates using Set
  const validImages = images.filter(Boolean);
  return Array.from(new Set(validImages));
}

/**
 * Remove duplicate image URLs and filter out invalid ones
 * @param images Array of image URLs
 * @param options Configuration options
 * @returns Array of unique, valid image URLs
 */
export function deduplicateAndValidateImages(
  images: string[],
  options: {
    maxImages?: number;
    allowEmpty?: boolean;
  } = {}
): string[] {
  const { maxImages = 12, allowEmpty = false } = options;

  if (!Array.isArray(images)) {
    return allowEmpty ? [] : ['/images/default-restaurant.webp'];
  }

  // Filter out falsy values and invalid URLs
  const validImages = images.filter(url => {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // Skip empty or whitespace-only URLs
    if (url.trim() === '') {
      return false;
    }
    
    // Reject obviously broken URLs
    if (url.includes('undefined') || url.includes('null')) {
      return false;
    }
    
    return true;
  });

  // Remove duplicates using Set
  const uniqueImages = Array.from(new Set(validImages));

  // If no valid images and empty is not allowed, return fallback
  if (uniqueImages.length === 0 && !allowEmpty) {
    return ['/images/default-restaurant.webp'];
  }

  // Limit to maxImages if specified
  return maxImages > 0 ? uniqueImages.slice(0, maxImages) : uniqueImages;
}

/**
 * Process and deduplicate restaurant images with comprehensive validation
 * @param images Array of image URLs from various sources
 * @param options Configuration options
 * @returns Array of processed, unique image URLs
 */
export function processRestaurantImagesWithDeduplication(
  images: string[],
  options: {
    maxImages?: number;
    category?: string;
    enableLogging?: boolean;
  } = {}
): string[] {
  const { maxImages = 12, category = 'restaurant', enableLogging = false } = options;

  if (enableLogging) {
    console.log(`[ImageDeduplication] Processing ${images?.length || 0} images for ${category}`);
  }

  // First, deduplicate and validate
  const uniqueImages = deduplicateAndValidateImages(images, { maxImages, allowEmpty: true });

  if (enableLogging) {
    console.log(`[ImageDeduplication] After deduplication: ${uniqueImages.length} unique images`);
  }

  // If no valid images, return fallback
  if (uniqueImages.length === 0) {
    return ['/images/default-restaurant.webp'];
  }

  return uniqueImages;
}
