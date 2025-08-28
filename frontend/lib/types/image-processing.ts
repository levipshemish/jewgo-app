/**
 * Image Processing Types
 * =======================
 * 
 * Comprehensive type definitions for image processing utilities
 * Provides proper typing for image validation, URL handling, and image APIs
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

// ============================================================================
// Core Image Types
// ============================================================================

export interface ImageData {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  format?: ImageFormat;
  size?: number; // in bytes
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  format: ImageFormat;
  width: number;
  height: number;
  size: number;
  createdAt?: Date;
  modifiedAt?: Date;
  exif?: ExifData;
}

export interface ExifData {
  camera?: string;
  lens?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  focalLength?: number;
  gps?: GpsData;
  orientation?: number;
}

export interface GpsData {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'svg' | 'bmp' | 'tiff';

// ============================================================================
// Image URL Types
// ============================================================================

export interface ImageUrlConfig {
  url: string;
  fallbackUrl?: string;
  validateOnLoad?: boolean;
  retryCount?: number;
  timeout?: number;
}

export interface ImageUrlValidationResult {
  isValid: boolean;
  url: string;
  error?: string;
  isAccessible?: boolean;
  format?: ImageFormat;
  size?: number;
}

export interface ImageUrlTransform {
  width?: number;
  height?: number;
  quality?: number;
  format?: ImageFormat;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  gravity?: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';
  effects?: ImageEffect[];
}

export interface ImageEffect {
  type: 'blur' | 'sharpen' | 'brightness' | 'contrast' | 'saturation' | 'hue';
  value: number;
}

// ============================================================================
// Image Provider Types
// ============================================================================

export interface ImageProvider {
  name: string;
  domain: string;
  supportsTransforms: boolean;
  supportsFormats: ImageFormat[];
  maxFileSize?: number;
  rateLimit?: RateLimit;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey?: string;
  apiSecret?: string;
  secure: boolean;
  defaultTransforms?: ImageUrlTransform;
}

export interface GooglePlacesConfig {
  apiKey: string;
  maxWidth?: number;
  maxHeight?: number;
  photoReference?: string;
}

export interface UnsplashConfig {
  accessKey: string;
  secretKey?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  quality?: number;
}

// ============================================================================
// Image Validation Types
// ============================================================================

export interface ImageValidationConfig {
  allowedFormats?: ImageFormat[];
  maxFileSize?: number;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  validateOnLoad?: boolean;
  timeout?: number;
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: ImageMetadata;
  accessibility?: ImageAccessibilityResult;
}

export interface ImageAccessibilityResult {
  isAccessible: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export interface ImageUrlPattern {
  pattern: RegExp | string;
  provider: string;
  validation?: (url: string) => boolean;
}

// ============================================================================
// Image Processing Types
// ============================================================================

export interface ImageProcessingConfig {
  resize?: ResizeConfig;
  crop?: CropConfig;
  compress?: CompressConfig;
  format?: FormatConfig;
  effects?: EffectConfig[];
}

export interface ResizeConfig {
  width?: number;
  height?: number;
  mode: 'fit' | 'fill' | 'scale' | 'thumb';
  maintainAspectRatio?: boolean;
}

export interface CropConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  gravity?: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface CompressConfig {
  quality: number; // 0-100
  format?: ImageFormat;
  progressive?: boolean;
}

export interface FormatConfig {
  format: ImageFormat;
  quality?: number;
  progressive?: boolean;
}

export interface EffectConfig {
  type: 'blur' | 'sharpen' | 'brightness' | 'contrast' | 'saturation' | 'hue' | 'grayscale' | 'sepia';
  value: number;
}

// ============================================================================
// Image API Types
// ============================================================================

export interface ImageApiResponse {
  success: boolean;
  data?: ImageData;
  error?: string;
  metadata?: {
    processingTime: number;
    cacheHit: boolean;
    transformations: string[];
  };
}

export interface ImageUploadResponse {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
  metadata?: {
    size: number;
    format: ImageFormat;
    width: number;
    height: number;
  };
}

export interface ImageSearchResponse {
  success: boolean;
  images: ImageData[];
  total: number;
  page: number;
  perPage: number;
  error?: string;
}

// ============================================================================
// Image Cache Types
// ============================================================================

export interface ImageCacheConfig {
  enabled: boolean;
  maxSize: number; // in MB
  maxAge: number; // in seconds
  strategy: 'lru' | 'fifo' | 'lfu';
}

export interface CachedImage {
  url: string;
  data: ImageData;
  timestamp: number;
  accessCount: number;
  size: number;
}

export interface ImageCacheStats {
  hits: number;
  misses: number;
  size: number;
  count: number;
  hitRate: number;
}

// ============================================================================
// Image Error Types
// ============================================================================

export interface ImageError {
  code: string;
  message: string;
  url?: string;
  details?: any;
}

export type ImageErrorCode = 
  | 'INVALID_URL'
  | 'UNSUPPORTED_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'DIMENSIONS_INVALID'
  | 'DOMAIN_BLOCKED'
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'PROCESSING_ERROR'
  | 'VALIDATION_FAILED';

// ============================================================================
// Image Utility Function Types
// ============================================================================

export interface ImageUtils {
  // URL validation
  isValidImageUrl: (url: string, config?: ImageValidationConfig) => boolean;
  validateImageUrl: (url: string, config?: ImageValidationConfig) => Promise<ImageUrlValidationResult>;
  isAccessibleImageUrl: (url: string, timeout?: number) => Promise<boolean>;
  
  // URL processing
  getSafeImageUrl: (url?: string) => string;
  fixCloudinaryUrl: (url: string) => string;
  transformImageUrl: (url: string, transforms: ImageUrlTransform) => string;
  
  // Image processing
  processImage: (image: ImageData, config: ImageProcessingConfig) => Promise<ImageData>;
  resizeImage: (image: ImageData, config: ResizeConfig) => Promise<ImageData>;
  compressImage: (image: ImageData, config: CompressConfig) => Promise<ImageData>;
  
  // Validation
  validateImage: (file: File, config?: ImageValidationConfig) => Promise<ImageValidationResult>;
  validateImageDimensions: (width: number, height: number, config?: ImageValidationConfig) => boolean;
  validateImageFormat: (format: ImageFormat, allowedFormats?: ImageFormat[]) => boolean;
  validateImageSize: (size: number, maxSize?: number) => boolean;
  
  // Utilities
  getImageFormat: (url: string) => ImageFormat | null;
  getImageDimensions: (url: string) => Promise<{ width: number; height: number }>;
  getImageSize: (url: string) => Promise<number>;
  isCloudinaryUrl: (url: string) => boolean;
  isGooglePlacesUrl: (url: string) => boolean;
  isUnsplashUrl: (url: string) => boolean;
}

// ============================================================================
// Image Hook Types
// ============================================================================

export interface UseImageReturn {
  image: ImageData | null;
  loading: boolean;
  error: ImageError | null;
  refetch: () => Promise<void>;
  transform: (transforms: ImageUrlTransform) => void;
}

export interface UseImageUploadReturn {
  upload: (file: File) => Promise<ImageUploadResponse>;
  uploading: boolean;
  error: ImageError | null;
  progress: number;
}

export interface UseImageValidationReturn {
  validate: (file: File) => Promise<ImageValidationResult>;
  validating: boolean;
  error: ImageError | null;
  result: ImageValidationResult | null;
}

// ============================================================================
// Image Component Types
// ============================================================================

export interface ImageComponentProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: (error: ImageError) => void;
  className?: string;
  style?: React.CSSProperties;
  transforms?: ImageUrlTransform;
  validation?: ImageValidationConfig;
}

export interface ImageGalleryProps {
  images: ImageData[];
  columns?: number;
  gap?: number;
  aspectRatio?: number;
  loading?: 'lazy' | 'eager';
  onImageClick?: (image: ImageData, index: number) => void;
  className?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isImageFormat(format: string): format is ImageFormat {
  return ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'tiff'].includes(format);
}

export function isImageData(obj: any): obj is ImageData {
  return typeof obj === 'object' && 
         obj !== null && 
         typeof obj.url === 'string';
}

export function isImageError(obj: any): obj is ImageError {
  return typeof obj === 'object' && 
         obj !== null && 
         typeof obj.code === 'string' && 
         typeof obj.message === 'string';
}

export function isImageValidationResult(obj: any): obj is ImageValidationResult {
  return typeof obj === 'object' && 
         obj !== null && 
         typeof obj.isValid === 'boolean' && 
         Array.isArray(obj.errors) && 
         Array.isArray(obj.warnings);
}

// ============================================================================
// Constants
// ============================================================================

export const SUPPORTED_IMAGE_FORMATS: ImageFormat[] = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

export const DEFAULT_IMAGE_VALIDATION_CONFIG: ImageValidationConfig = {
  allowedFormats: SUPPORTED_IMAGE_FORMATS,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxWidth: 4096,
  maxHeight: 4096,
  minWidth: 1,
  minHeight: 1,
  validateOnLoad: true,
  timeout: 10000,
};

export const IMAGE_PROVIDERS: Record<string, ImageProvider> = {
  cloudinary: {
    name: 'Cloudinary',
    domain: 'cloudinary.com',
    supportsTransforms: true,
    supportsFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  googlePlaces: {
    name: 'Google Places',
    domain: 'googleusercontent.com',
    supportsTransforms: false,
    supportsFormats: ['jpg', 'jpeg', 'png'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
  unsplash: {
    name: 'Unsplash',
    domain: 'unsplash.com',
    supportsTransforms: true,
    supportsFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
};
