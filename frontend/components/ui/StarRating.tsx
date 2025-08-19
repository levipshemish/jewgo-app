import { Star } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils/cn';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showHalfStars?: boolean;
  className?: string;
  starClassName?: string;
}

/**
 * Unified Star Rating Component
 * 
 * Consolidates all renderStars functions from across the codebase.
 * Supports both simple and complex star rendering with half-star support.
 */
export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  showHalfStars = false,
  className,
  starClassName
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const starSize = sizeClasses[size];

  // Simple star rendering (like ReviewSnippets)
  if (!showHalfStars) {
    return (
      <div className={cn('flex items-center', className)}>
        {Array.from({ length: maxRating }, (_, i) => (
          <Star
            key={i}
            className={cn(
              starSize,
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
              starClassName
            )}
          />
        ))}
      </div>
    );
  }

  // Complex star rendering with half-stars (like ReviewsSection)
  const stars: React.ReactElement[] = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <svg 
        key={i} 
        className={cn(
          'text-yellow-400 fill-current',
          starSize,
          starClassName
        )} 
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }

  // Half star
  if (hasHalfStar) {
    stars.push(
      <svg 
        key="half" 
        className={cn(
          'text-yellow-400 fill-current',
          starSize,
          starClassName
        )} 
        viewBox="0 0 20 20"
      >
        <defs>
          <linearGradient id="halfStar">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="#e5e7eb" />
          </linearGradient>
        </defs>
        <path 
          fill="url(#halfStar)" 
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
        />
      </svg>
    );
  }

  // Empty stars
  const emptyStars = maxRating - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <svg 
        key={`empty-${i}`} 
        className={cn(
          'text-gray-300 fill-current',
          starSize,
          starClassName
        )} 
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      {stars}
    </div>
  );
};

// Convenience function for backward compatibility
export const renderStars = (rating: number, options?: {
  size?: 'sm' | 'md' | 'lg';
  showHalfStars?: boolean;
  className?: string;
}) => {
  return (
    <StarRating
      rating={rating}
      size={options?.size || 'md'}
      showHalfStars={options?.showHalfStars || false}
      className={options?.className}
    />
  );
};

export default StarRating;
