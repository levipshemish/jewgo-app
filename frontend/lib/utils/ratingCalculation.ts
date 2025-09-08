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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('calculateRatingFromGoogleReviews: Parsed data:', {
        dataType: typeof googleReviewsData,
        isArray: Array.isArray(googleReviewsData),
        hasReviews: !!(googleReviewsData.reviews && Array.isArray(googleReviewsData.reviews)),
        directArray: Array.isArray(googleReviewsData) ? googleReviewsData.length : 0,
        reviewsArray: googleReviewsData.reviews ? googleReviewsData.reviews.length : 0
      });
    }
    
    // Handle different data structures - match the logic from individual eatery page
    const reviewsArray = !googleReviewsData
      ? []
      : Array.isArray(googleReviewsData)
        ? googleReviewsData
        : (googleReviewsData.reviews && Array.isArray(googleReviewsData.reviews)
            ? googleReviewsData.reviews
            : []);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('calculateRatingFromGoogleReviews: Final reviews array:', {
        reviewCount: reviewsArray.length,
        reviews: reviewsArray.map((r: any) => ({ rating: r.rating, author: r.author }))
      });
    }
    
    if (reviewsArray.length > 0) {
      const validRatings = reviewsArray
        .map((review: any) => review.rating)
        .filter((rating: any) => typeof rating === 'number' && rating > 0);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('calculateRatingFromGoogleReviews: Valid ratings:', validRatings);
      }
      
      if (validRatings.length > 0) {
        const averageRating = validRatings.reduce((sum: number, rating: number) => sum + rating, 0) / validRatings.length;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('calculateRatingFromGoogleReviews: Average rating:', averageRating);
        }
        
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
  rating?: number | string | null;
  star_rating?: number | string | null;
  quality_rating?: number | string | null;
  google_reviews?: string | null;
  [key: string]: any; // Allow for additional fields
}): number | null {
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('getBestAvailableRating called with:', {
      name: restaurant.name,
      id: restaurant.id,
      google_rating: restaurant.google_rating,
      rating: restaurant.rating,
      star_rating: restaurant.star_rating,
      quality_rating: restaurant.quality_rating,
      hasGoogleReviews: !!restaurant.google_reviews,
      googleReviewsLength: restaurant.google_reviews ? restaurant.google_reviews.length : 0
    });
  }

  // Use google_rating as primary source for consistency between grid and detail pages
  let rating = restaurant.google_rating ?? restaurant.rating ?? restaurant.star_rating ?? restaurant.quality_rating;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('getBestAvailableRating: Rating fields check:', {
      name: restaurant.name,
      id: restaurant.id,
      google_rating: restaurant.google_rating,
      rating: restaurant.rating,
      star_rating: restaurant.star_rating,
      quality_rating: restaurant.quality_rating,
      selectedRating: rating,
      hasGoogleReviews: !!restaurant.google_reviews
    });
  }
  
  // Only calculate from Google reviews if no rating fields are available
  if ((rating === null || rating === undefined) && restaurant.google_reviews) {
    rating = calculateRatingFromGoogleReviews(restaurant.google_reviews);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('getBestAvailableRating: Calculated rating from google_reviews as fallback:', rating);
    }
  }
  
  // Convert to number if it's a string
  if (rating && typeof rating === 'string') {
    const numRating = parseFloat(rating);
    rating = isNaN(numRating) ? null : numRating;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Final rating:', rating);
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

