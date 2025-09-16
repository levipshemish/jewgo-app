/**
 * Shul Types
 * ===========
 * 
 * Type definitions for shul-related data structures and interfaces
 * Used for synagogue listings, grid cards, and related components
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

// ============================================================================
// Shul Grid Card Types
// ============================================================================

export type ShulGridCard = {
  /** Shul image URL */
  imageUrl: string;

  /** Shuls.name */
  title: string;

  /** Reserved for future badges (currently null/blank) */
  badge: string | null;

  /** Shuls.rabbi_name */
  subtitle: string;

  /**
   * address string (shuls.address) needs to be computed field
   * such as "0.6 mi" / ZIP code (if lat/lng + PostGIS sorting is used).
   */
  additionalText: string | null;

  /** Show heart icon for favorites */
  showHeart: boolean;

  /** Whether user has liked this shul */
  isLiked: boolean;

  /** Overlay tag (shuls.shul_category) */
  imageTag: string;
};

// ============================================================================
// Database Shul Schema Types
// ============================================================================

export interface RealShul {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone_number?: string;
  website?: string;
  email?: string;
  shul_type?: string;
  shul_category?: string;
  denomination?: string;
  business_hours?: string;
  hours_parsed?: boolean;
  timezone?: string;
  has_daily_minyan?: boolean;
  has_shabbat_services?: boolean;
  has_holiday_services?: boolean;
  has_women_section?: boolean;
  has_mechitza?: boolean;
  has_separate_entrance?: boolean;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  review_count?: number;
  star_rating?: number;
  google_rating?: number;
  image_url?: string;
  logo_url?: string;
  has_parking?: boolean;
  has_disabled_access?: boolean;
  has_kiddush_facilities?: boolean;
  has_social_hall?: boolean;
  has_library?: boolean;
  has_hebrew_school?: boolean;
  has_adult_education?: boolean;
  has_youth_programs?: boolean;
  has_senior_programs?: boolean;
  rabbi_name?: string;
  rabbi_phone?: string;
  rabbi_email?: string;
  religious_authority?: string;
  community_affiliation?: string;
  kosher_certification?: string;
  membership_required?: boolean;
  membership_fee?: number;
  fee_currency?: string;
  accepts_visitors?: boolean;
  visitor_policy?: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
}

// ============================================================================
// Transformation Utils
// ============================================================================

// Helper function to calculate distance using Haversine formula (same as eatery)
function calculateDistance(location1: { latitude: number; longitude: number }, location2: { latitude: number; longitude: number }): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (location2.latitude - location1.latitude) * Math.PI / 180;
  const dLon = (location2.longitude - location1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to format distance (same as eatery)
function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 5280)} ft`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)} miles`;
  } else {
    return `${Math.round(distance)} miles`;
  }
}

/**
 * Transform a RealShul object to ShulGridCard format
 * Uses same distance/zip logic as eatery page, with address-only fallback
 */
export function transformShulToGridCard(
  shul: RealShul,
  userLocation?: { latitude: number; longitude: number } | null
): ShulGridCard {
  // Same logic as eatery page: distance if both locations available, otherwise fallback
  let additionalText: string | null = null;
  
  const hasUserLocation = !!userLocation;
  const hasShulLocation = !!(shul.latitude && shul.longitude && 
                            shul.latitude !== 0 && shul.longitude !== 0);
  
  if (hasUserLocation && hasShulLocation) {
    // Calculate distance using same logic as eatery
    const distance = calculateDistance(
      { latitude: userLocation!.latitude, longitude: userLocation!.longitude },
      { latitude: shul.latitude!, longitude: shul.longitude! }
    );
    additionalText = formatDistance(distance);
  } else {
    // Fallback priority: zip_code > city > address snippet
    if (shul.zip_code) {
      additionalText = shul.zip_code;
    } else if (shul.city) {
      additionalText = shul.city;
    } else if (shul.address) {
      // Extract city/zip from address if available
      const addressParts = shul.address.split(',');
      if (addressParts.length >= 2) {
        // Try to get the last part which might have zip
        const lastPart = addressParts[addressParts.length - 1].trim();
        const zipMatch = lastPart.match(/\b\d{5}(-\d{4})?\b/);
        if (zipMatch) {
          additionalText = zipMatch[0];
        } else {
          // Use city part (usually second to last)
          additionalText = addressParts[addressParts.length - 2].trim();
        }
      } else {
        // Just show first part of address
        additionalText = addressParts[0].substring(0, 20) + '...';
      }
    } else {
      additionalText = null;
    }
  }

  return {
    imageUrl: shul.image_url || shul.logo_url || "/images/default-restaurant.webp",
    title: shul.name || 'Unnamed Shul',
    badge: null, // Reserved for future use
    subtitle: shul.rabbi_name || '',
    additionalText: additionalText,
    showHeart: true,
    isLiked: false, // This will be determined by favorites context
    imageTag: shul.shul_category || '',
  };
}
