/**
 * Utility functions for calculating ratings from various sources
 */

export interface Review {
  rating: number;
  text?: string;
  author?: string;
  time?: number;
}

/**
 * Calculate average rating from an array of reviews
 */
export function calculateAverageRating(reviews: Review[]): number | null {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return null;
  }

  const validReviews = reviews.filter(r => r.rating && r.rating > 0);
  if (validReviews.length === 0) {
    return null;
  }

  const totalRating = validReviews.reduce((sum, r) => sum + r.rating, 0);
  return totalRating / validReviews.length;
}

/**
 * Parse Google reviews JSON string and calculate average rating
 * Uses the same robust parsing logic as the individual eatery page
 */
export function calculateRatingFromGoogleReviews(googleReviewsJson: string): number | null {
  if (!googleReviewsJson || typeof googleReviewsJson !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.log('calculateRatingFromGoogleReviews: Invalid input:', {
        googleReviewsJson,
        type: typeof googleReviewsJson
      });
    }
    return null;
  }

  try {
    // Use the same robust parsing logic as the individual eatery page
    const { parseGoogleReviews } = require('@/lib/parseGoogleReviews');
    const googleReviewsData = parseGoogleReviews(googleReviewsJson);
    
    // Removed excessive logging
    
    // Handle different data structures - match the logic from individual eatery page
    const reviewsArray = !googleReviewsData
      ? []
      : Array.isArray(googleReviewsData)
        ? googleReviewsData
        : (googleReviewsData.reviews && Array.isArray(googleReviewsData.reviews)
            ? googleReviewsData.reviews
            : []);
    
    // Removed excessive logging
    
    if (reviewsArray.length > 0) {
      const validRatings = reviewsArray
        .map((review: any) => review.rating)
        .filter((rating: any) => typeof rating === 'number' && rating > 0);
      
      // Removed excessive logging
      
      if (validRatings.length > 0) {
        const averageRating = validRatings.reduce((sum: number, rating: number) => sum + rating, 0) / validRatings.length;
        
        // Removed excessive logging
        
        return averageRating;
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('calculateRatingFromGoogleReviews: No valid ratings found');
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse Google reviews JSON:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('calculateRatingFromGoogleReviews: JSON parse error:', {
        error: error instanceof Error ? error.message : String(error),
        jsonPreview: `${googleReviewsJson.substring(0, 200)}...`
      });
    }
    return null;
  }
}

/**
 * Get the best available rating from restaurant data
 * Tries multiple rating fields and falls back to calculating from reviews
 */
export function getBestAvailableRating(restaurant: {
  google_rating?: number | string | null;
  rating?: number | string | null;
  star_rating?: number | string | null;
  quality_rating?: number | string | null;
  google_reviews?: string | null;
  [key: string]: any; // Allow for additional fields
}): number | null {
  // Use google_rating as primary source for consistency between grid and detail pages
  let rating = restaurant.google_rating ?? restaurant.rating ?? restaurant.star_rating ?? restaurant.quality_rating;
  
  // Only calculate from Google reviews if no rating fields are available
  if ((rating === null || rating === undefined) && restaurant.google_reviews) {
    rating = calculateRatingFromGoogleReviews(restaurant.google_reviews);
  }
  
  // Convert to number if it's a string
  if (rating && typeof rating === 'string') {
    const numRating = parseFloat(rating);
    rating = isNaN(numRating) ? null : numRating;
  }

  return rating as number | null;
}

/**
 * Format rating to 1 decimal place, return 0.0 if invalid
 */
export function formatRating(rating: number | string | null | undefined): string {
  if (rating === null || rating === undefined) {
    return '0.0';
  }

  const num = typeof rating === 'number' ? rating : parseFloat(String(rating));
  return Number.isFinite(num) ? num.toFixed(1) : '0.0';
}

