// import { isProblematicCloudinaryUrl } from './imageValidation';
/**
 * Image URL validation and fallback utilities for JewGo
 * Provides safe image URL handling with fallbacks
 */

// Invalid domains that should be rejected
const INVALID_DOMAINS = [
  'example.com',
  'placeholder.com',
  'invalid-domain.com',
  'test.com',
  'localhost',
  '127.0.0.1'
];

// Domains that often have expired or restricted URLs
const EXPIRED_DOMAINS = [
  'lh3.googleusercontent.com', // Google Places photos often expire
  'maps.googleapis.com' // Google Places API URLs expire
];

/**
 * Get a safe image URL with fallback handling
 * @param imageUrl - The original image URL
 * @returns A safe image URL or fallback
 */
export function getSafeImageUrl(imageUrl?: string): string {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return '/images/default-restaurant.webp';
  }

  // Skip empty or whitespace-only URLs
  if (imageUrl.trim() === '') {
    return '/images/default-restaurant.webp';
  }

  // Check for problematic patterns
  const problematicPatterns = [
    'undefined',
    'null',
    'placeholder',
    'default',
    'fallback'
  ];

  const hasProblematicPattern = problematicPatterns.some(pattern => 
    imageUrl.toLowerCase().includes(pattern)
  );

  if (hasProblematicPattern) {
    return '/images/default-restaurant.webp';
  }

  // For Cloudinary URLs, ensure proper format
  if (imageUrl.includes('cloudinary.com')) {
    let normalizedUrl = imageUrl;
    
    // Add Cloudinary optimization parameters if missing
    if (!normalizedUrl.includes('/f_auto,q_auto/')) {
      normalizedUrl = normalizedUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
    }
    
    return normalizedUrl;
  }

  // Check for expired or restricted domains
  const isExpiredDomain = EXPIRED_DOMAINS.some(domain => imageUrl.includes(domain));
  if (isExpiredDomain) {
    // Return fallback for expired Google Places URLs
    return '/images/default-restaurant.webp';
  }

  // For Unsplash URLs, return as-is (they're already optimized)
  if (imageUrl.includes('unsplash.com')) {
    return imageUrl;
  }

  return imageUrl;
}

/**
 * Check if a URL is likely to be accessible
 */
export function isLikelyAccessibleUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
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
 * Filter and validate image URLs
 */
export function filterValidImageUrls(urls: string[]): string[] {
  if (!Array.isArray(urls)) {
    return [];
  }

  return urls.filter(url => {
    if (!url || typeof url !== 'string') {
      return false;
    }

    if (url.trim() === '') {
      return false;
    }

    return isLikelyAccessibleUrl(url) && !getSafeImageUrl(url).includes('default-restaurant.webp');
  });
}

/**
 * Validates if an image URL is safe to use with Next.js Image component
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check for obviously invalid URLs
  try {
    const urlObj = new URL(url);
    
    // Check if domain is in the invalid list
    if (INVALID_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
      return false;
    }
    
    // Must be http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    return true;
  } catch {
    // If URL constructor throws, it's invalid
    return false;
  }
}

/**
 * Fixes malformed Cloudinary URLs
 */
export function fixCloudinaryUrl(url: string): string {
  // Fix common Cloudinary URL issues
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    // 0) Ensure absolute HTTPS Cloudinary URL and correct scheme slashes
    if (/^\/\//i.test(url)) {
      url = `https:${url}`;
    } else if (/^\/res\.cloudinary\.com/i.test(url)) {
      url = `https://${url.replace(/^\/+/, '')}`;
    } else if (/^res\.cloudinary\.com/i.test(url)) {
      url = `https://${url}`;
    } else if (/^https?:\/res\.cloudinary\.com/i.test(url)) {
      // Fix cases like "https:/res.cloudinary.com/..." (single slash)
      url = url.replace(/^https?:\//i, 'https://');
    }

    // Separate origin and path so we do not collapse '://'
    const originMatch = url.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
    const origin = originMatch ? originMatch[1] : 'https://res.cloudinary.com';
    let path = originMatch ? (originMatch[2] || '') : url.replace(/^https?:\/\//i, '');

    // Pattern 0: Remove stray numeric path segment placed before the jewgo folder
    // Example: /image/upload/9/jewgo/restaurants/... -> /image/upload/jewgo/restaurants/...
    // Works even when transforms are present before the number
    path = path.replace(/\/\d+\/(?=jewgo\/)/, '/');
    
    // Pattern 0b: Remove numeric segments that appear after transforms but before jewgo
    // Example: /image/upload/f_auto,q_auto/0/jewgo/restaurants/... -> /image/upload/f_auto,q_auto/jewgo/restaurants/...
    path = path.replace(/(\/image\/upload\/[^/]*)\/\d+\/(jewgo\/)/, '$1/$2');
    
    // Pattern 0c: More comprehensive fix for numeric segments before jewgo
    // This catches cases where the numeric segment appears anywhere before jewgo
    path = path.replace(/(\/image\/upload\/[^/]*?)\/\d+\/(jewgo\/)/, '$1/$2');

    // Pattern 1: Extra number segment between version and jewgo path
    // Examples: v175435386/0/jewgo -> v175435386/jewgo
    //          v17543611/2/jewgo -> v17543611/jewgo
    //          v17543507/0/jewgo -> v17543507/jewgo
    const extraNumberRegex = /(\/v\d+)\/\d+\/(jewgo\/)/;
    if (extraNumberRegex.test(path)) {
      path = path.replace(extraNumberRegex, '$1/$2');
    } else {
      // Pattern 2: Missing slash after version number
      // Example: v1234567890jewgo -> v1234567890/jewgo
      const versionRegex = /(\/v\d+)([^\/])/;
      if (versionRegex.test(path)) {
        path = path.replace(versionRegex, '$1/$2');
      }
    }

    // Pattern 3: Keep the original file extensions as they appear to be valid in the current dataset
    // path = path.replace(/\/(image_\d+)\.(jpg|jpeg|png|webp|avif)$/i, '/$1');

    // Pattern 3b: Ensure sensible default transforms (f_auto,q_auto) are present
    const uploadPrefix = '/image/upload/';
    if (path.includes(uploadPrefix) && !/\/image\/upload\/[^/]*f_auto/.test(path)) {
      path = path.replace(uploadPrefix, `${uploadPrefix}f_auto,q_auto/`);
    }

    // Pattern 4: Multiple consecutive slashes - clean them up (path only)
    path = path.replace(/\/{2,}/g, '/');

    // Pattern 5: Ensure proper path structure after fixes
    // Make sure we have /jewgo/restaurants/ in the correct format
    if (path.includes('/jewgo/') && !path.includes('/jewgo/restaurants/')) {
      path = path.replace('/jewgo/', '/jewgo/restaurants/');
    }

    // Pattern 6: Handle suspicious/truncated version numbers by removing version entirely
    // Cloudinary works with versionless URLs (serves latest). If version looks too short, drop it.
    // Note: the version segment may appear after one or more transform segments (e.g., f_auto,q_auto/)
    const versionExtract = path.match(/\/image\/upload\/(?:[^/]+\/)*?(v(\d+))\//i);
    if (versionExtract) {
      const versionDigits = versionExtract[2] || '';
      if (versionDigits.length > 0 && versionDigits.length < 10) {
        // Remove just the version segment regardless of preceding transforms
        path = path.replace(/(\/image\/upload\/(?:[^/]+\/)*?)v\d+\//i, '$1');
      }
    }

    // Recombine
    url = origin + path;
  }

  return url;
}

/**
 * Validates and sanitizes restaurant image URLs
 */
export function sanitizeRestaurantImageUrl(restaurant: any): string {
  const imageUrl = restaurant?.image_url || restaurant?.imageUrl;
  return getSafeImageUrl(imageUrl);
}

/**
 * Bulk sanitize restaurant data
 */
export function sanitizeRestaurantData(restaurants: any[]): any[] {
  return restaurants.map(restaurant => ({
    ...restaurant,
    image_url: sanitizeRestaurantImageUrl(restaurant),
    additional_images: filterValidImageUrls(restaurant.additional_images || []).map(getSafeImageUrl),
    images: Array.isArray(restaurant.images) ? restaurant.images.map((img: any) => ({
      ...img,
      image_url: getSafeImageUrl(img.image_url)
    })) : []
  }));
}
