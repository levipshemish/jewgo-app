import Image, { ImageProps } from 'next/image';
import React, { useState } from 'react';

import { cn } from '@/lib/utils/classNames';

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  showLoadingState?: boolean;
  aspectRatio?: 'square' | 'video' | 'photo' | 'wide' | 'custom';
  customAspectRatio?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src, fallbackSrc = '/images/default-restaurant.webp', className = '', containerClassName = '', showLoadingState = true, aspectRatio = 'photo', customAspectRatio, alt, fill = true, sizes, priority = false, loading = 'lazy', onError, onLoad, ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(showLoadingState);
  const [currentSrc, setCurrentSrc] = useState(src);

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    photo: 'aspect-[3/4]',
    wide: 'aspect-[16/9]',
    custom: customAspectRatio || 'aspect-[3/4]'
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Only switch to fallback for the specific failing image, don't affect others
    if (!imageError && currentSrc !== fallbackSrc) {
      setImageError(true);
      setCurrentSrc(fallbackSrc);
    }
    setImageLoading(false);
    onError?.(e);
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageLoading(false);
    onLoad?.(e);
  };

  const defaultSizes = sizes || "200px";

  return (
    <div className={cn(
      'relative overflow-hidden bg-gray-100',
      aspectRatioClasses[aspectRatio],
      containerClassName
    )}>
      {/* Loading State */}
      {imageLoading && showLoadingState && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
          <div className="animate-pulse bg-gray-300 w-full h-full" />
        </div>
      )}

      {/* Optimized Image */}
      <Image
        src={currentSrc}
        alt={alt || 'Image'}
        fill={fill}
        className={cn(
          'object-cover transition-opacity duration-300',
          imageLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        sizes={defaultSizes}
        priority={priority}
        loading={loading}

        onError={handleError}
        onLoad={handleLoad}
        unoptimized={currentSrc?.includes('cloudinary.com')}
        {...props}
      />

      {/* Error Fallback */}
      {imageError && currentSrc === fallbackSrc && (
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

export default OptimizedImage;
