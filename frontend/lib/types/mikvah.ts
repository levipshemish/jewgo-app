/**
 * Mikvah-specific type definitions
 */

// Grid card type for mikvah listings (simplified and focused)
export type MikvahGridCard = {
  imageUrl: string;
  title: string; // Mikvah name
  badge?: { rating: number; reviewCount: number }; // optional
  subtitle?: string; // Rabbi/Director/Balaniyot lead
  additionalText: string; // distance or ZIP
  showHeart: boolean;
  isLiked: boolean;
  mikvahCategory?: "Women" | "Men" | "Keilim" | "Women & Keilim" | "Men & Keilim" | "Full Service";
  city: string; // short address line/city
  imageTag?: "Women" | "Men" | "Keilim"; // overlay
};

// Raw mikvah data from database/API
export interface RealMikvah {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  website?: string;
  email?: string;
  mikvah_type?: string;
  mikvah_category?: string;
  business_hours?: string;
  requires_appointment?: boolean;
  appointment_phone?: string;
  appointment_website?: string;
  walk_in_available?: boolean;
  advance_booking_days?: number;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  review_count?: number;
  star_rating?: number;
  google_rating?: number;
  image_url?: string;
  logo_url?: string;
  has_changing_rooms?: boolean;
  has_shower_facilities?: boolean;
  has_towels_provided?: boolean;
  has_soap_provided?: boolean;
  has_hair_dryers?: boolean;
  has_private_entrance?: boolean;
  has_disabled_access?: boolean;
  has_parking?: boolean;
  rabbinical_supervision?: string;
  kosher_certification?: string;
  community_affiliation?: string;
  religious_authority?: string;
  fee_amount?: number;
  fee_currency?: string;
  accepts_credit_cards?: boolean;
  accepts_cash?: boolean;
  accepts_checks?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Transform RealMikvah to MikvahGridCard for grid display
 */
export function transformMikvahToGridCard(
  mikvah: RealMikvah,
  userLocation?: { latitude: number; longitude: number } | null
): MikvahGridCard {
  // Calculate distance if user location and mikvah coordinates are available
  let additionalText = '';
  const hasUserLocation = !!(userLocation?.latitude && userLocation?.longitude);
  const hasMikvahLocation = !!(mikvah.latitude && mikvah.longitude && 
    mikvah.latitude !== 0 && mikvah.longitude !== 0);
  
  if (hasUserLocation && hasMikvahLocation) {
    // Calculate distance using Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = (mikvah.latitude! - userLocation!.latitude) * Math.PI / 180;
    const dLon = (mikvah.longitude! - userLocation!.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation!.latitude * Math.PI / 180) * Math.cos(mikvah.latitude! * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Format distance (same as eatery/shul pages)
    if (distance < 0.1) {
      additionalText = `${Math.round(distance * 5280)}ft`;
    } else if (distance < 1) {
      additionalText = `${Math.round(distance * 10) / 10}mi`;
    } else if (distance < 10) {
      additionalText = `${distance.toFixed(1)}mi`;
    } else {
      additionalText = `${Math.round(distance)}mi`;
    }
  } else {
    // Fallback to zip code or city if no distance can be calculated
    additionalText = mikvah.zip_code || mikvah.city || '';
  }

  // Determine mikvah category based on type and features
  let mikvahCategory: MikvahGridCard['mikvahCategory'];
  const type = mikvah.mikvah_type?.toLowerCase() || '';
  
  if (type.includes('women') && type.includes('men')) {
    mikvahCategory = 'Full Service';
  } else if (type.includes('women') && type.includes('keilim')) {
    mikvahCategory = 'Women & Keilim';
  } else if (type.includes('men') && type.includes('keilim')) {
    mikvahCategory = 'Men & Keilim';
  } else if (type.includes('women')) {
    mikvahCategory = 'Women';
  } else if (type.includes('men')) {
    mikvahCategory = 'Men';
  } else if (type.includes('keilim')) {
    mikvahCategory = 'Keilim';
  } else {
    mikvahCategory = 'Women'; // Default assumption
  }

  // Determine image tag (overlay) - prioritize women, then men, then keilim
  let imageTag: MikvahGridCard['imageTag'];
  if (mikvahCategory?.includes('Women')) {
    imageTag = 'Women';
  } else if (mikvahCategory?.includes('Men')) {
    imageTag = 'Men';
  } else if (mikvahCategory?.includes('Keilim')) {
    imageTag = 'Keilim';
  }

  // Create badge if rating exists
  const rating = mikvah.rating || mikvah.star_rating || mikvah.google_rating;
  const reviewCount = mikvah.review_count || 0;
  const badge = rating && reviewCount ? { rating, reviewCount } : undefined;

  // Create subtitle from rabbinical supervision or director info
  const subtitle = mikvah.rabbinical_supervision || 
    mikvah.religious_authority || 
    mikvah.community_affiliation || 
    undefined;

  return {
    imageUrl: mikvah.image_url || mikvah.logo_url || '/api/placeholder/400/300',
    title: mikvah.name,
    badge,
    subtitle,
    additionalText,
    showHeart: true,
    isLiked: false, // Would need to check favorites
    mikvahCategory,
    city: mikvah.city || '',
    imageTag
  };
}

/**
 * Helper function to calculate distance between two coordinates
 */
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Helper function to format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)}ft`;
  } else if (distance < 1) {
    return `${Math.round(distance * 10) / 10}mi`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}mi`;
  } else {
    return `${Math.round(distance)}mi`;
  }
}
