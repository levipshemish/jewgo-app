import { isProblematicCloudinaryUrl } from './imageValidation';
/**
 * Image URL validation and fallback utilities
 */

const INVALID_DOMAINS = [
  'example.com',
  'localhost',
  '127.0.0.1',
  'test.com',
  'placeholder.com'
];

const DEFAULT_RESTAURANT_IMAGE = '/images/default-restaurant.webp';

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

    // Pattern 3: Fix specifically broken public IDs that end with image_\d+.{ext}
    // Our dataset often references image_# with a file extension that doesn't exist in Cloudinary.
    // Cloudinary supports extensionless public IDs and will serve the best format with f_auto.
    path = path.replace(/\/(image_\d+)\.(jpg|jpeg|png|webp|avif)$/i, '/$1');

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
 * Returns a safe image URL, falling back to default if invalid
 * Updated to be less aggressive
 */
export function getSafeImageUrl(url: string | null | undefined): string {
  if (!url) {
    return DEFAULT_RESTAURANT_IMAGE;
  }
  
  // Initial quick reject for clearly broken Cloudinary URLs
  if (url.includes('cloudinary.com') && /undefined|null/.test(url)) {
    return DEFAULT_RESTAURANT_IMAGE;
  }
  
  // Only reject URLs that are clearly problematic, not all image_1 patterns
  if (url.includes('cloudinary.com') && isProblematicCloudinaryUrl(url)) {
    return DEFAULT_RESTAURANT_IMAGE;
  }

  // Fix common URL issues first
  const fixedUrl = fixCloudinaryUrl(url);

  // Re-check after fixes in case the shape still matches a problematic pattern
  if (fixedUrl.includes('cloudinary.com') && isProblematicCloudinaryUrl(fixedUrl)) {
    return DEFAULT_RESTAURANT_IMAGE;
  }

  if (isValidImageUrl(fixedUrl)) {
    return fixedUrl;
  }

  return DEFAULT_RESTAURANT_IMAGE;
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
    image_url: sanitizeRestaurantImageUrl(restaurant)
  }));
}
