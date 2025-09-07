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
    const reviews: Review[] = JSON.parse(googleReviewsJson);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('calculateRatingFromGoogleReviews: Parsed reviews:', {
        reviewCount: reviews.length,
        reviews: reviews.map(r => ({ rating: r.rating, author: r.author }))
      });
    }
    
    const averageRating = calculateAverageRating(reviews);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('calculateRatingFromGoogleReviews: Average rating:', averageRating);
    }
    
    return averageRating;
  } catch (error) {
    console.warn('Failed to parse Google reviews JSON:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('calculateRatingFromGoogleReviews: JSON parse error:', {
        error: error.message,
        jsonPreview: googleReviewsJson.substring(0, 200) + '...'
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
  google_reviews?: string | null;
  [key: string]: any; // Allow for additional fields
}): number | null {
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('getBestAvailableRating called with:', {
      name: restaurant.name,
      id: restaurant.id,
      google_rating: restaurant.google_rating,
      google_rating_type: typeof restaurant.google_rating,
      hasGoogleReviews: !!restaurant.google_reviews,
      googleReviewsLength: restaurant.google_reviews ? restaurant.google_reviews.length : 0
    });
  }

  // Try google_rating first (this is the main rating field in the database)
  let rating = restaurant.google_rating;
  
  // Convert to number if it's a string
  if (rating && typeof rating === 'string') {
    const numRating = parseFloat(rating);
    rating = isNaN(numRating) ? null : numRating;
  }

  // If no direct rating found, try to calculate from google_reviews
  if (!rating && restaurant.google_reviews) {
    rating = calculateRatingFromGoogleReviews(restaurant.google_reviews);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Calculated rating from google_reviews:', rating);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Final rating:', rating);
  }

  return rating as number | null;
}

/**
 * Format rating to 1 decimal place, return empty string if invalid
 */
export function formatRating(rating: number | string | null | undefined): string {
  if (rating === null || rating === undefined) {
    return '';
  }

  const num = typeof rating === 'number' ? rating : parseFloat(String(rating));
  return Number.isFinite(num) && num > 0 ? num.toFixed(1) : '';
}

