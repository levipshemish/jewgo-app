import Image, { ImageProps } from 'next/image';
import React from 'react';

import { useLazyImage } from '@/lib/hooks/useLazyLoading';
import { cn } from '@/lib/utils/classNames';

interface LazyImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: 'square' | 'video' | 'photo' | 'wide' | 'custom';
  customAspectRatio?: string;
  threshold?: number;
  rootMargin?: string;
  showPlaceholder?: boolean;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src, fallbackSrc = '/images/default-restaurant.webp', className = '', containerClassName = '', aspectRatio = 'photo', customAspectRatio, alt, fill = true, sizes, priority = false, threshold = 0.1, rootMargin = '50px', showPlaceholder = true, onError, onLoad, ...props
}) => {
  const {
    ref,
    isVisible,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError
  } = useLazyImage({ threshold, rootMargin });

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    photo: 'aspect-[3/4]',
    wide: 'aspect-[16/9]',
    custom: customAspectRatio || 'aspect-[3/4]'
  };

  const defaultSizes = sizes || "(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw";

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Mark only this instance as errored; component already swaps to fallbackSrc via imageError flag
    handleImageError();
    onError?.(e);
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageLoad();
    onLoad?.(e);
  };

  return (
    <div 
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        'relative overflow-hidden bg-gray-100',
        aspectRatioClasses[aspectRatio],
        containerClassName
      )}
    >
      {/* Placeholder */}
      {showPlaceholder && !isVisible && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="animate-pulse bg-gray-300 w-full h-full" />
        </div>
      )}

      {/* Loading State */}
      {isVisible && !imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Image */}
      {isVisible && (
        <Image
          src={imageError ? fallbackSrc : src}
          alt={alt || 'Image'}
          fill={fill}
          className={cn(
            'object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          sizes={defaultSizes}
          priority={priority}
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/webp;base64,UklGRnoGAABXRUJQVlA4IG4GAACwYwCdASoKAAYABUB8JYwCdAEO/v7+AA=="
          onError={handleError}
          onLoad={handleLoad}
          unoptimized={src?.includes('cloudinary.com')}
          {...props}
        />
      )}

      {/* Error Fallback */}
      {imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-gray-600 text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
