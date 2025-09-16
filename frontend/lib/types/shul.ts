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
// Shul Details Page Types
// ============================================================================

export type ShulListing = {
  // Header
  backButton: boolean;
  tags: {
    shulCategory: string;   // shuls.shul_category
    shulType: string;       // shuls.shul_type
  };
  viewCount: number;
  shareCount: number;
  showHeart: boolean;
  isLiked: boolean;

  // Content
  imageUrl: string;         // shuls.image_url
  leftText: string;         // shuls.name
  rightText?: string;       // shuls.community_affiliation (neighborhood/area)
  leftAction?: string;      // shuls.rabbi_name
  rightAction?: string;     // Distance or ZIP (lat/long → sorted same as grid)
  leftIcon?: string;        // optional icon, blank by default
  rightIcon?: string;       // optional icon, blank by default

  // Actions
  primaryAction?: { 
    label: string;          // e.g., "Donate"
    onClick: string;        // route/handler
  };                        // shuls.donation_url
  secondaryActions?: { 
    label: string;          // e.g., "Website" | "Email" | "Call"
    onClick: string;        // route/handler
  }[];                      // shuls.website, email, phone_number
  bottomAction?: { 
    label: string;          // e.g., "Hours"
    opens: "hoursPopup"; 
  };                        // shuls.business_hours

  // Core Info
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };                        // shuls.address
  locationLink?: string;    // link to maps
  description?: string;     // shuls.description

  // Hours (structured, "cool")
  prayerTimes: {
    weekday?: {
      shacharis: { times: string[]; bizmana?: boolean };
      mincha:    { times: string[]; bizmana?: boolean };
      maariv:    { times: string[]; bizmana?: boolean };
      notes?: string;
    };
    erevShabbos?: {
      mincha: { times: string[]; bizmana?: boolean };
      candleLightingOffsetMin?: number; 
      notes?: string;
    };
    shabbos?: {
      shacharis: { times: string[] };
      mincha:    { times: string[]; bizmana?: boolean };
      maariv:    { times: string[]; bizmana?: boolean };
      zemanim?: {
        hadlakasNeiros?: string;
        shkiah?: string;
        tzeis?: string;
      };
      notes?: string;
    };
    motzeiShabbos?: { maariv?: { times: string[] } };
    yomTov?: {
      label?: string; 
      schedules?: { 
        dayLabel: string; 
        shacharis?: string[]; 
        mincha?: string[]; 
        maariv?: string[]; 
      }[];
    };
    timezone?: string;      
    lastUpdated?: string;   // ISO
  };

  // Reviews (optional)
  reviews?: { 
    user: string; 
    rating: number; 
    comment?: string; 
    date: string; 
  }[];
  reviewsPagination?: { 
    page: number; 
    pageSize: number; 
    total: number; 
  };

  // Features / Amenities
  features?: {
    coffeeMachine?: boolean;
    mensMikvah?: boolean;
    womensMikvah?: boolean;
    eventHall?: boolean;
    kiddushRoom?: boolean;
    shiurimSchedule?: boolean;
    ezrasNashim?: boolean;
    strollerParking?: boolean;
    accessibleEntrance?: boolean;
    parking?: boolean;
    playArea?: boolean;
    wifi?: boolean;
    nurseryRoom?: boolean;
    seforimLibrary?: boolean;
    // extend as needed
  };

  // Contact Info
  contacts?: {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  };

  // Moderation & Metadata
  moderation?: { 
    verified: boolean; 
    verifiedBy?: string; 
    updatedBy?: string; 
    updatedAt?: string; 
  };
  meta?: { 
    slug: string; 
    externalIds?: Record<string, string>; 
  };
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

// Helper function to format distance (consistent with main app - using "mi" not "miles")
function formatDistance(distance: number): string {
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)}ft`; // Convert to feet
  } else if (distance < 1) {
    return `${Math.round(distance * 10) / 10}mi`; // Show as 0.1mi, 0.2mi, etc.
  } else if (distance < 10) {
    return `${distance.toFixed(1)}mi`; // Show as 1.2mi, 2.5mi, etc.
  } else {
    return `${Math.round(distance)}mi`; // Show as 12mi, 25mi, etc.
  }
}

/**
 * Parse business hours string into structured prayer times
 */
function parsePrayerTimes(businessHours?: string): ShulListing['prayerTimes'] {
  if (!businessHours) {
    return {};
  }

  // This is a basic parser - can be enhanced based on actual data patterns
  const prayerTimes: ShulListing['prayerTimes'] = {};

  try {
    // Try to parse as JSON first (if structured data exists)
    const parsed = JSON.parse(businessHours);
    return parsed;
  } catch {
    // Fall back to text parsing
    const lines = businessHours.split('\n').map(line => line.trim()).filter(Boolean);
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Basic pattern matching for common prayer time formats
      if (lower.includes('weekday') || lower.includes('sunday-thursday')) {
        prayerTimes.weekday = {
          shacharis: { times: [] },
          mincha: { times: [] },
          maariv: { times: [] }
        };
        // Extract times from the line (simplified)
        const timeMatches = line.match(/\d{1,2}:\d{2}\s*(am|pm)?/gi);
        if (timeMatches) {
          prayerTimes.weekday.shacharis.times = timeMatches.slice(0, 2);
          prayerTimes.weekday.mincha.times = timeMatches.slice(2, 4);
          prayerTimes.weekday.maariv.times = timeMatches.slice(4, 6);
        }
      }
      
      if (lower.includes('shabbos') || lower.includes('saturday')) {
        prayerTimes.shabbos = {
          shacharis: { times: [] },
          mincha: { times: [] },
          maariv: { times: [] }
        };
        const timeMatches = line.match(/\d{1,2}:\d{2}\s*(am|pm)?/gi);
        if (timeMatches) {
          prayerTimes.shabbos.shacharis.times = timeMatches.slice(0, 1);
          prayerTimes.shabbos.mincha.times = timeMatches.slice(1, 2);
          prayerTimes.shabbos.maariv.times = timeMatches.slice(2, 3);
        }
      }
    }
  }

  return prayerTimes;
}

/**
 * Parse address string into structured address components
 */
function parseAddress(addressString?: string): ShulListing['address'] {
  if (!addressString) {
    return {
      line1: '',
      city: '',
      state: '',
      zip: ''
    };
  }

  const parts = addressString.split(',').map(part => part.trim());
  
  if (parts.length >= 3) {
    // Format: "123 Main St, Miami, FL 33101"
    const line1 = parts[0];
    const city = parts[1];
    const stateZip = parts[2];
    
    // Try to extract state and zip from last part
    const stateZipMatch = stateZip.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) {
      return {
        line1,
        city,
        state: stateZipMatch[1],
        zip: stateZipMatch[2],
        country: 'USA'
      };
    } else {
      return {
        line1,
        city,
        state: stateZip,
        zip: '',
        country: 'USA'
      };
    }
  } else if (parts.length === 2) {
    // Format: "123 Main St, Miami FL"
    return {
      line1: parts[0],
      city: parts[1],
      state: '',
      zip: '',
      country: 'USA'
    };
  } else {
    // Single string
    return {
      line1: addressString,
      city: '',
      state: '',
      zip: '',
      country: 'USA'
    };
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
        additionalText = `${addressParts[0].substring(0, 20)}...`;
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
    additionalText,
    showHeart: true,
    isLiked: false, // This will be determined by favorites context
    imageTag: shul.shul_category || '',
  };
}

/**
 * Transform a RealShul object to ShulListing format for details page
 */
export function transformShulToListing(
  shul: RealShul,
  userLocation?: { latitude: number; longitude: number } | null,
  options: {
    viewCount?: number;
    shareCount?: number;
    isLiked?: boolean;
    reviews?: ShulListing['reviews'];
  } = {}
): ShulListing {
  // Calculate distance/location text (same logic as grid card)
  let rightAction: string | undefined = undefined;
  
  const hasUserLocation = !!userLocation;
  const hasShulLocation = !!(shul.latitude && shul.longitude && 
                            shul.latitude !== 0 && shul.longitude !== 0);
  
  if (hasUserLocation && hasShulLocation) {
    const distance = calculateDistance(
      { latitude: userLocation!.latitude, longitude: userLocation!.longitude },
      { latitude: shul.latitude!, longitude: shul.longitude! }
    );
    rightAction = formatDistance(distance);
  } else if (shul.zip_code) {
    rightAction = shul.zip_code;
  } else if (shul.city) {
    rightAction = shul.city;
  }

  // Build secondary actions
  const secondaryActions: ShulListing['secondaryActions'] = [];
  
  if (shul.website) {
    secondaryActions.push({
      label: 'Website',
      onClick: shul.website
    });
  }
  
  if (shul.email) {
    secondaryActions.push({
      label: 'Email',
      onClick: `mailto:${shul.email}`
    });
  }
  
  if (shul.phone_number) {
    secondaryActions.push({
      label: 'Call',
      onClick: `tel:${shul.phone_number}`
    });
  }

  // Map database features to listing features
  const features: ShulListing['features'] = {
    parking: shul.has_parking || false,
    accessibleEntrance: shul.has_disabled_access || false,
    kiddushRoom: shul.has_kiddush_facilities || false,
    eventHall: shul.has_social_hall || false,
    seforimLibrary: shul.has_library || false,
    ezrasNashim: shul.has_women_section || false,
  };

  // Generate location link for maps
  const locationLink = hasShulLocation 
    ? `https://www.google.com/maps/dir/?api=1&destination=${shul.latitude},${shul.longitude}`
    : shul.address 
      ? `https://www.google.com/maps/search/${encodeURIComponent(shul.address)}`
      : undefined;

  return {
    // Header
    backButton: true,
    tags: {
      shulCategory: shul.shul_category || 'Synagogue',
      shulType: shul.shul_type || shul.denomination || 'Orthodox'
    },
    viewCount: options.viewCount || 0,
    shareCount: options.shareCount || 0,
    showHeart: true,
    isLiked: options.isLiked || false,

    // Content
    imageUrl: shul.image_url || shul.logo_url || "/images/default-restaurant.webp",
    leftText: shul.name || 'Unnamed Shul',
    rightText: shul.community_affiliation || undefined,
    leftAction: shul.rabbi_name || undefined,
    rightAction,
    leftIcon: undefined,
    rightIcon: undefined,

    // Actions
    primaryAction: undefined, // No donation URL in current schema
    secondaryActions: secondaryActions.length > 0 ? secondaryActions : undefined,
    bottomAction: shul.business_hours ? {
      label: 'Hours',
      opens: 'hoursPopup'
    } : undefined,

    // Core Info
    address: parseAddress(shul.address),
    locationLink: locationLink,
    description: shul.description || undefined,

    // Hours
    prayerTimes: parsePrayerTimes(shul.business_hours),

    // Reviews
    reviews: options.reviews,
    reviewsPagination: options.reviews ? {
      page: 1,
      pageSize: options.reviews.length,
      total: options.reviews.length
    } : undefined,

    // Features
    features: features,

    // Contact Info
    contacts: {
      phone: shul.phone_number || undefined,
      email: shul.email || undefined,
      website: shul.website || undefined,
      whatsapp: undefined // Not in current schema
    },

    // Moderation & Metadata
    moderation: {
      verified: shul.is_verified || false,
      verifiedBy: undefined,
      updatedBy: undefined,
      updatedAt: shul.updated_at || undefined
    },
    meta: {
      slug: shul.name ? shul.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '',
      externalIds: undefined
    }
  };
}
