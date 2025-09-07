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
 * Attempt to fix common JSON malformation issues
 */
function attemptJsonFix(jsonString: string): string {
  let fixed = jsonString.trim();
  
  // Remove any leading/trailing non-JSON characters
  fixed = fixed.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
  
  // If it starts with a quote, try to unescape it
  if (fixed.startsWith('"') && fixed.endsWith('"')) {
    try {
      fixed = JSON.parse(fixed);
    } catch {
      // If that fails, just remove the quotes
      fixed = fixed.slice(1, -1);
    }
  }
  
  // Try to fix common escape issues
  fixed = fixed.replace(/\\"/g, '"').replace(/\\'/g, "'");
  
  return fixed;
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
    // Enhanced error logging to see exactly what malformed JSON we're receiving
    console.warn('Failed to parse Google reviews JSON:', {
      error: error,
      jsonString: googleReviewsJson,
      jsonLength: googleReviewsJson.length,
      jsonPreview: googleReviewsJson.substring(0, 200) + (googleReviewsJson.length > 200 ? '...' : ''),
      jsonType: typeof googleReviewsJson,
      jsonFirstChar: googleReviewsJson.charAt(0),
      jsonLastChar: googleReviewsJson.charAt(googleReviewsJson.length - 1)
    });
    
    // Try to fix common JSON issues and parse again
    try {
      const fixedJson = attemptJsonFix(googleReviewsJson);
      const reviews: Review[] = JSON.parse(fixedJson);
      console.log('Successfully parsed after JSON fix');
      return calculateAverageRating(reviews);
    } catch (secondError) {
      console.warn('Failed to parse even after JSON fix attempt:', secondError);
      return null;
    }
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

/**
 * Get rating with fallback - returns a default rating if no rating is found
 * Useful for debugging to see which restaurants are missing ratings
 */
export function getRatingWithFallback(restaurant: any, fallbackRating: number = 3.5): string {
  const rating = getBestAvailableRating(restaurant);
  
  if (rating) {
    return formatRating(rating);
  }
  
  // For debugging: show fallback rating to identify missing ratings
  if (process.env.NODE_ENV === 'development') {
    console.warn(`No rating found for ${restaurant.name} (ID: ${restaurant.id}), using fallback: ${fallbackRating}`);
  }
  
  return formatRating(fallbackRating);
}
