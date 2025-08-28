/**
 * Enhanced Image Processing with Type Safety
 * ==========================================
 * 
 * Improved image processing utilities with comprehensive type safety
 * and better error handling for image validation and processing.
 * 
 * Author: JewGo Development Team
 * Version: 2.0
 */

import {
  SUPPORTED_IMAGE_FORMATS,
  DEFAULT_IMAGE_VALIDATION_CONFIG,
  IMAGE_PROVIDERS,
  isImageFormat,
  isImageData,
  isImageError,
  isImageValidationResult
} from '../types/image-processing';
import type {
  ImageData,
  ImageMetadata,
  ExifData,
  GpsData,
  ImageFormat,
  ImageUrlConfig,
  ImageUrlValidationResult,
  ImageUrlTransform,
  ImageEffect,
  ImageProvider,
  RateLimit,
  CloudinaryConfig,
  GooglePlacesConfig,
  UnsplashConfig,
  ImageValidationConfig,
  ImageValidationResult,
  ImageAccessibilityResult,
  ImageUrlPattern,
  ImageProcessingConfig,
  ResizeConfig,
  CropConfig,
  CompressConfig,
  FormatConfig,
  EffectConfig,
  ImageApiResponse,
  ImageUploadResponse,
  ImageSearchResponse,
  ImageCacheConfig,
  CachedImage,
  ImageCacheStats,
  ImageError,
  ImageErrorCode,
  ImageUtils,
  UseImageReturn,
  UseImageUploadReturn,
  UseImageValidationReturn,
  ImageComponentProps,
  ImageGalleryProps
} from '../types/image-processing';

// ============================================================================
// Enhanced Image URL Validation
// ============================================================================

/**
 * Enhanced image URL validation with comprehensive checking
 */
export function isValidImageUrlEnhanced(
  url: string, 
  config: ImageValidationConfig = DEFAULT_IMAGE_VALIDATION_CONFIG
): boolean {
  try {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Basic URL validation
    const urlObj = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Check blocked domains
    if (config.blockedDomains?.some(domain => urlObj.hostname.includes(domain))) {
      return false;
    }
    
    // Check allowed domains if specified
    if (config.allowedDomains && !config.allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return false;
    }
    
    // Check file extension
    const pathname = urlObj.pathname.toLowerCase();
    const extension = pathname.split('.').pop();
    
    if (extension && !SUPPORTED_IMAGE_FORMATS.includes(extension as ImageFormat)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Enhanced image URL validation with detailed result
 */
export async function validateImageUrlEnhanced(
  url: string, 
  config: ImageValidationConfig = DEFAULT_IMAGE_VALIDATION_CONFIG
): Promise<ImageUrlValidationResult> {
  try {
    if (!isValidImageUrlEnhanced(url, config)) {
      return {
        isValid: false,
        url,
        error: 'Invalid image URL format',
      };
    }

    // Check accessibility if enabled
    if (config.validateOnLoad) {
      const accessibility = await checkImageAccessibility(url, config.timeout);
      if (!accessibility.isAccessible) {
        return {
          isValid: false,
          url,
          error: accessibility.error || 'Image is not accessible',
          isAccessible: false,
        };
      }
    }

    // Get image format
    const format = getImageFormatEnhanced(url);
    
    // Get image size if possible
    let size: number | undefined;
    try {
      size = await getImageSizeEnhanced(url);
    } catch {
      // Size check is optional
    }

    return {
      isValid: true,
      url,
      format: format || undefined,
      size,
      isAccessible: true,
    };
  } catch (error) {
    return {
      isValid: false,
      url,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Enhanced image accessibility check
 */
export async function checkImageAccessibility(
  url: string, 
  timeout: number = 10000
): Promise<ImageAccessibilityResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    const responseTime = Date.now() - startTime;
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return {
        isAccessible: false,
        statusCode: response.status,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    // Check if it's actually an image
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      return {
        isAccessible: false,
        statusCode: response.status,
        responseTime,
        error: 'URL does not point to an image',
      };
    }
    
    return {
      isAccessible: true,
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    return {
      isAccessible: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// Enhanced Image URL Processing
// ============================================================================

/**
 * Enhanced safe image URL with comprehensive fallback handling
 */
export function getSafeImageUrlEnhanced(url?: string, fallbackUrl?: string): string {
  const defaultFallback = '/images/default-restaurant.webp';
  const finalFallback = fallbackUrl || defaultFallback;
  
  if (!url || typeof url !== 'string') {
    return finalFallback;
  }

  // Skip empty or whitespace-only URLs
  if (url.trim() === '') {
    return finalFallback;
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
    url.toLowerCase().includes(pattern)
  );

  if (hasProblematicPattern) {
    return finalFallback;
  }

  // Provider-specific processing
  if (url.includes('cloudinary.com')) {
    return processCloudinaryUrlEnhanced(url);
  }

  if (url.includes('googleusercontent.com')) {
    return processGooglePlacesUrlEnhanced(url);
  }

  if (url.includes('unsplash.com')) {
    return processUnsplashUrlEnhanced(url);
  }

  return url;
}

/**
 * Enhanced Cloudinary URL processing
 */
export function processCloudinaryUrlEnhanced(url: string): string {
  try {
    // Normalize known broken 'image_1.{ext}' variants
    let normalizedUrl = url.replace(/\/image_1\.(jpg|jpeg|png|webp|avif)$/i, '/image_1');
    
    // Add Cloudinary optimization parameters if missing
    if (!normalizedUrl.includes('/f_auto,q_auto/')) {
      normalizedUrl = normalizedUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
    }
    
    // Fix common Cloudinary URL issues
    normalizedUrl = fixCloudinaryUrlEnhanced(normalizedUrl);
    
    return normalizedUrl;
  } catch (error) {
    console.error('Error processing Cloudinary URL:', error);
    return url;
  }
}

/**
 * Enhanced Cloudinary URL fixing
 */
export function fixCloudinaryUrlEnhanced(url: string): string {
  // Fix common Cloudinary URL issues
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    // Ensure absolute HTTPS Cloudinary URL
    if (/^\/\//i.test(url)) {
      url = `https:${url}`;
    } else if (/^\/res\.cloudinary\.com/i.test(url)) {
      url = `https://${url.replace(/^\/+/, '')}`;
    } else if (/^res\.cloudinary\.com/i.test(url)) {
      url = `https://${url}`;
    }

    // Fix malformed URLs
    url = url.replace(/^https?:\/res\.cloudinary\.com/i, 'https://res.cloudinary.com');
    
    // Remove problematic numeric segments
    url = url.replace(/\/\d+\/(?=jewgo\/)/, '/');
    url = url.replace(/(\/image\/upload\/[^/]*)\/\d+\/(jewgo\/)/, '$1/$2');
    
    // Fix version numbers
    url = url.replace(/(\/v\d+)\/\d+\/(jewgo\/)/, '$1/$2');
    url = url.replace(/(\/v\d+)([^\/])/g, '$1/$2');
    
    // Fix file extensions
    url = url.replace(/\/(image_\d+)\.(jpg|jpeg|png|webp|avif)$/i, '/$1');
    
    // Ensure transforms are present
    if (url.includes('/image/upload/') && !/\/image\/upload\/[^/]*f_auto/.test(url)) {
      url = url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
    }
    
    // Clean up multiple slashes
    url = url.replace(/\/{2,}/g, '/');
  }

  return url;
}

/**
 * Enhanced Google Places URL processing
 */
export function processGooglePlacesUrlEnhanced(url: string): string {
  // Google Places URLs are generally reliable, just ensure they're HTTPS
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

/**
 * Enhanced Unsplash URL processing
 */
export function processUnsplashUrlEnhanced(url: string): string {
  // Unsplash URLs are generally reliable, just ensure they're HTTPS
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// ============================================================================
// Enhanced Image Format Detection
// ============================================================================

/**
 * Enhanced image format detection
 */
export function getImageFormatEnhanced(url: string): ImageFormat | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check file extension
    const extension = pathname.split('.').pop();
    if (extension && isImageFormat(extension)) {
      return extension as ImageFormat;
    }
    
    // Check content-type from URL parameters
    const contentType = urlObj.searchParams.get('format') || 
                       urlObj.searchParams.get('f') ||
                       urlObj.searchParams.get('type');
    
    if (contentType && isImageFormat(contentType)) {
      return contentType as ImageFormat;
    }
    
    // Provider-specific format detection
    if (url.includes('cloudinary.com')) {
      return detectCloudinaryFormat(url);
    }
    
    if (url.includes('googleusercontent.com')) {
      return 'jpg'; // Google Places typically serves JPEG
    }
    
    if (url.includes('unsplash.com')) {
      return 'jpg'; // Unsplash typically serves JPEG
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Detect Cloudinary image format
 */
function detectCloudinaryFormat(url: string): ImageFormat | null {
  // Check for format in transforms
  const formatMatch = url.match(/\/f_(jpg|jpeg|png|webp|avif|gif)/i);
  if (formatMatch) {
    return formatMatch[1] as ImageFormat;
  }
  
  // Check for format in file extension
  const extensionMatch = url.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i);
  if (extensionMatch) {
    return extensionMatch[1] as ImageFormat;
  }
  
  return 'jpg'; // Default for Cloudinary
}

// ============================================================================
// Enhanced Image Size Detection
// ============================================================================

/**
 * Enhanced image size detection
 */
export async function getImageSizeEnhanced(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    
    throw new Error('Content-Length header not available');
  } catch (error) {
    throw new Error(`Failed to get image size: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhanced image dimensions detection
 */
export async function getImageDimensionsEnhanced(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension detection'));
    };
    
    img.src = url;
  });
}

// ============================================================================
// Enhanced Image Validation
// ============================================================================

/**
 * Enhanced image validation with comprehensive checking
 */
export async function validateImageEnhanced(
  file: File, 
  config: ImageValidationConfig = DEFAULT_IMAGE_VALIDATION_CONFIG
): Promise<ImageValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Check file size
    if (config.maxFileSize && file.size > config.maxFileSize) {
      errors.push(`File size ${file.size} exceeds maximum ${config.maxFileSize}`);
    }
    
    // Check file type
    const format = file.type.split('/')[1] as ImageFormat;
    if (!isImageFormat(format)) {
      errors.push(`Unsupported file format: ${format}`);
    } else if (config.allowedFormats && !config.allowedFormats.includes(format)) {
      errors.push(`File format ${format} is not allowed`);
    }
    
    // Check dimensions if specified
    if (config.maxWidth || config.maxHeight || config.minWidth || config.minHeight) {
      try {
        const dimensions = await getImageDimensionsFromFile(file);
        
        if (config.maxWidth && dimensions.width > config.maxWidth) {
          errors.push(`Image width ${dimensions.width} exceeds maximum ${config.maxWidth}`);
        }
        
        if (config.maxHeight && dimensions.height > config.maxHeight) {
          errors.push(`Image height ${dimensions.height} exceeds maximum ${config.maxHeight}`);
        }
        
        if (config.minWidth && dimensions.width < config.minWidth) {
          warnings.push(`Image width ${dimensions.width} is below minimum ${config.minWidth}`);
        }
        
        if (config.minHeight && dimensions.height < config.minHeight) {
          warnings.push(`Image height ${dimensions.height} is below minimum ${config.minHeight}`);
        }
      } catch (error) {
        warnings.push('Could not verify image dimensions');
      }
    }
    
    // Get metadata if possible
    let metadata: ImageMetadata | undefined;
    try {
      metadata = await getImageMetadataFromFile(file);
    } catch (error) {
      warnings.push('Could not extract image metadata');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Validation failed'],
      warnings,
    };
  }
}

/**
 * Get image dimensions from file
 */
function getImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get image metadata from file
 */
async function getImageMetadataFromFile(file: File): Promise<ImageMetadata> {
  const format = file.type.split('/')[1] as ImageFormat;
  const dimensions = await getImageDimensionsFromFile(file);
  
  return {
    format,
    width: dimensions.width,
    height: dimensions.height,
    size: file.size,
    createdAt: new Date(file.lastModified),
  };
}

// ============================================================================
// Enhanced Image Processing
// ============================================================================

/**
 * Enhanced image URL transformation
 */
export function transformImageUrlEnhanced(
  url: string, 
  transforms: ImageUrlTransform
): string {
  try {
    if (url.includes('cloudinary.com')) {
      return transformCloudinaryUrl(url, transforms);
    }
    
    if (url.includes('unsplash.com')) {
      return transformUnsplashUrl(url, transforms);
    }
    
    // For other providers, return original URL
    return url;
  } catch (error) {
    console.error('Error transforming image URL:', error);
    return url;
  }
}

/**
 * Transform Cloudinary URL
 */
function transformCloudinaryUrl(url: string, transforms: ImageUrlTransform): string {
  let transformedUrl = url;
  
  // Add width and height
  if (transforms.width || transforms.height) {
    const sizeParams = [];
    if (transforms.width) sizeParams.push(`w_${transforms.width}`);
    if (transforms.height) sizeParams.push(`h_${transforms.height}`);
    
    if (transforms.crop) {
      sizeParams.push(`c_${transforms.crop}`);
    }
    
    if (transforms.gravity) {
      sizeParams.push(`g_${transforms.gravity}`);
    }
    
    transformedUrl = transformedUrl.replace('/image/upload/', `/image/upload/${sizeParams.join(',')}/`);
  }
  
  // Add quality
  if (transforms.quality) {
    transformedUrl = transformedUrl.replace('/image/upload/', `/image/upload/q_${transforms.quality}/`);
  }
  
  // Add format
  if (transforms.format) {
    transformedUrl = transformedUrl.replace('/image/upload/', `/image/upload/f_${transforms.format}/`);
  }
  
  // Add effects
  if (transforms.effects) {
    const effectParams = transforms.effects.map(effect => `${effect.type}_${effect.value}`);
    transformedUrl = transformedUrl.replace('/image/upload/', `/image/upload/e_${effectParams.join(':')}/`);
  }
  
  return transformedUrl;
}

/**
 * Transform Unsplash URL
 */
function transformUnsplashUrl(url: string, transforms: ImageUrlTransform): string {
  const urlObj = new URL(url);
  
  if (transforms.width) {
    urlObj.searchParams.set('w', transforms.width.toString());
  }
  
  if (transforms.height) {
    urlObj.searchParams.set('h', transforms.height.toString());
  }
  
  if (transforms.quality) {
    urlObj.searchParams.set('q', transforms.quality.toString());
  }
  
  return urlObj.toString();
}

// ============================================================================
// Enhanced Image Utils Interface
// ============================================================================

/**
 * Enhanced image utilities with comprehensive functionality
 */
export const imageUtilsEnhanced: ImageUtils = {
  // URL validation
  isValidImageUrl: isValidImageUrlEnhanced,
  validateImageUrl: validateImageUrlEnhanced,
  isAccessibleImageUrl: async (url: string, timeout?: number) => {
    const result = await checkImageAccessibility(url, timeout);
    return result.isAccessible;
  },
  
  // URL processing
  getSafeImageUrl: getSafeImageUrlEnhanced,
  fixCloudinaryUrl: fixCloudinaryUrlEnhanced,
  transformImageUrl: transformImageUrlEnhanced,
  
  // Image processing
  processImage: async (image: ImageData, config: ImageProcessingConfig) => {
    // Implementation would depend on the specific processing requirements
    return image;
  },
  resizeImage: async (image: ImageData, config: ResizeConfig) => {
    // Implementation would depend on the specific resizing requirements
    return image;
  },
  compressImage: async (image: ImageData, config: CompressConfig) => {
    // Implementation would depend on the specific compression requirements
    return image;
  },
  
  // Validation
  validateImage: validateImageEnhanced,
  validateImageDimensions: (width: number, height: number, config?: ImageValidationConfig) => {
    if (config?.maxWidth && width > config.maxWidth) {
      return false;
    }
    if (config?.maxHeight && height > config.maxHeight) {
      return false;
    }
    if (config?.minWidth && width < config.minWidth) {
      return false;
    }
    if (config?.minHeight && height < config.minHeight) {
      return false;
    }
    return true;
  },
  validateImageFormat: (format: ImageFormat, allowedFormats?: ImageFormat[]) => {
    if (!allowedFormats) return true;
    return allowedFormats.includes(format);
  },
  validateImageSize: (size: number, maxSize?: number) => {
    if (!maxSize) return true;
    return size <= maxSize;
  },
  
  // Utilities
  getImageFormat: getImageFormatEnhanced,
  getImageDimensions: getImageDimensionsEnhanced,
  getImageSize: getImageSizeEnhanced,
  isCloudinaryUrl: (url: string) => url.includes('cloudinary.com'),
  isGooglePlacesUrl: (url: string) => url.includes('googleusercontent.com'),
  isUnsplashUrl: (url: string) => url.includes('unsplash.com'),
};

// ============================================================================
// Export Enhanced Utilities
// ============================================================================

export default {
  // Enhanced URL validation
  isValidImageUrlEnhanced,
  validateImageUrlEnhanced,
  checkImageAccessibility,
  
  // Enhanced URL processing
  getSafeImageUrlEnhanced,
  processCloudinaryUrlEnhanced,
  fixCloudinaryUrlEnhanced,
  processGooglePlacesUrlEnhanced,
  processUnsplashUrlEnhanced,
  
  // Enhanced format detection
  getImageFormatEnhanced,
  
  // Enhanced size detection
  getImageSizeEnhanced,
  getImageDimensionsEnhanced,
  
  // Enhanced validation
  validateImageEnhanced,
  
  // Enhanced processing
  transformImageUrlEnhanced,
  
  // Enhanced utils
  imageUtilsEnhanced,
};
