import type { Restaurant } from '@/lib/types/restaurant';
import { parseGoogleReviews } from '@/lib/parseGoogleReviews';

// Compute a normalized numeric rating for a restaurant.
// Priority: rating, star_rating, google_rating, quality_rating. If missing/0, try to average from google_reviews payload.
export function computeRestaurantRating(r: Partial<Restaurant> & Record<string, any>): number | undefined {
  const raw = r?.rating ?? r?.star_rating ?? r?.google_rating ?? r?.quality_rating;
  const num = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (typeof num === 'number' && !isNaN(num) && num > 0) {
    return Number(num);
  }

  // Fallback: compute from google_reviews (may be JSON, Python-ish string, or already-parsed)
  if (r && r.google_reviews) {
    try {
      const data = parseGoogleReviews(r.google_reviews);
      const arr = Array.isArray(data) ? data : (data?.reviews && Array.isArray(data.reviews) ? data.reviews : undefined);
      if (arr && arr.length > 0) {
        const ratings = arr.map((rev: any) => rev?.rating).filter((v: any) => typeof v === 'number' && v > 0);
        if (ratings.length > 0) {
          const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
          return Number(avg);
        }
      }
    } catch {
      // ignore parse failures
    }
  }

  return undefined;
}

