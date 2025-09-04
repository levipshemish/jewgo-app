/**
 * Image fallback utilities to prevent 404 errors and provide graceful degradation
 */

export interface ImageFallbackOptions {
  defaultImage?: string;
  categoryFallbacks?: Record<string, string>;
  enableLogging?: boolean;
}

const DEFAULT_OPTIONS: ImageFallbackOptions = {
  defaultImage: '/images/default-restaurant.webp',
  categoryFallbacks: {
    'dairy': '/images/default-restaurant.webp',
    'meat': '/images/default-restaurant.webp',
    'pareve': '/images/default-restaurant.webp',
    'kosher': '/images/default-restaurant.webp',
    'vegan': '/images/default-restaurant.webp',
    'vegetarian': '/images/default-restaurant.webp'
  },
  enableLogging: process.env.NODE_ENV === 'development'
};

/**
 * Validates if an image URL is likely to work
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Skip validation for local images
  if (url.startsWith('/')) return true;
  
  // Skip validation for data URLs
  if (url.startsWith('data:')) return true;
  
  // Check for common broken patterns
  const brokenPatterns = [
    'cloudinary.com/demo',
    'res.cloudinary.com/demo',
    'example.com',
    'placeholder.com',
    'broken-image.com'
  ];
  
  return !brokenPatterns.some(pattern => url.includes(pattern));
}

/**
 * Gets a safe fallback image URL based on category
 */
export function getFallbackImageUrl(
  originalUrl: string | null | undefined,
  category?: string | null,
  options: ImageFallbackOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // If original URL is valid, use it
  if (originalUrl && isValidImageUrl(originalUrl)) {
    return originalUrl;
  }
  
  // If we have a category-specific fallback, use it
  if (category && opts.categoryFallbacks?.[category.toLowerCase()]) {
    if (opts.enableLogging) {
      console.log(`🖼️ Using category fallback for ${category}:`, opts.categoryFallbacks[category.toLowerCase()]);
    }
    return opts.categoryFallbacks[category.toLowerCase()];
  }
  
  // Use default fallback
  if (opts.enableLogging && originalUrl) {
    console.log(`🖼️ Using default fallback for broken URL:`, originalUrl);
  }
  
  return opts.defaultImage || '/images/default-restaurant.webp';
}

/**
 * Creates a robust image component with fallback handling
 */
export function createImageWithFallback(
  src: string | null | undefined,
  alt: string,
  category?: string | null,
  options: ImageFallbackOptions = {}
) {
  const safeSrc = getFallbackImageUrl(src, category, options);
  
  return {
    src: safeSrc,
    alt,
    onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const target = e.target as HTMLImageElement;
      if (target.src !== options.defaultImage) {
        if (options.enableLogging) {
          console.log(`🖼️ Image failed to load, using fallback:`, target.src);
        }
        target.src = options.defaultImage || '/images/default-restaurant.webp';
        target.onerror = null; // Prevent infinite loops
      }
    }
  };
}

/**
 * Preloads fallback images to ensure they're available
 */
export function preloadFallbackImages(): void {
  if (typeof window === 'undefined') return;
  
  const fallbackImages = [
    '/images/default-restaurant.webp',
    '/images/default-restaurant.jpg'
  ];
  
  fallbackImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}
