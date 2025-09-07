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
    return null;
  }

  try {
    const reviews: Review[] = JSON.parse(googleReviewsJson);
    return calculateAverageRating(reviews);
  } catch (error) {
    console.warn('Failed to parse Google reviews JSON:', error);
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
  // Try direct rating fields in order of preference
  const ratingFields = [
    restaurant.google_rating,
    restaurant.rating,
    restaurant.star_rating,
    restaurant.quality_rating,
    // Try additional common rating field names
    restaurant.overall_rating,
    restaurant.average_rating,
    restaurant.review_rating,
    restaurant.score
  ];

  // Find the first valid rating (not null, undefined, or 0)
  let rating = ratingFields.find(r => r !== null && r !== undefined && r !== 0);
  
  // Convert to number if it's a string
  if (rating && typeof rating === 'string') {
    const numRating = parseFloat(rating);
    rating = isNaN(numRating) ? null : numRating;
  }

  // If no direct rating found, try to calculate from google_reviews
  if (!rating && restaurant.google_reviews) {
    rating = calculateRatingFromGoogleReviews(restaurant.google_reviews);
  }

  // Additional fallback: try to find any field that looks like a rating
  if (!rating) {
    for (const [key, value] of Object.entries(restaurant)) {
      if (key.toLowerCase().includes('rating') || key.toLowerCase().includes('score')) {
        if (value && (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value))))) {
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          if (numValue > 0 && numValue <= 5) { // Reasonable rating range
            rating = numValue;
            break;
          }
        }
      }
    }
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

