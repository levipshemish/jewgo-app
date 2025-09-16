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

/**
 * Transform a RealShul object to ShulGridCard format
 */
export function transformShulToGridCard(
  shul: RealShul,
  userLocation?: { latitude: number; longitude: number } | null
): ShulGridCard {
  // Calculate distance if user location is available
  let distanceText: string | null = null;
  if (userLocation && shul.latitude && shul.longitude) {
    const { calculateDistance, formatDistance } = require('@/lib/utils/distance');
    const km = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      shul.latitude,
      shul.longitude
    );
    distanceText = formatDistance(km);
  } else if (shul.distance) {
    distanceText = shul.distance;
  }

  return {
    imageUrl: shul.image_url || shul.logo_url || "/images/default-restaurant.webp",
    title: shul.name || 'Unnamed Shul',
    badge: null, // Reserved for future use
    subtitle: shul.rabbi_name || '',
    additionalText: distanceText,
    showHeart: true,
    isLiked: false, // This will be determined by favorites context
    imageTag: shul.shul_category || '',
  };
}
