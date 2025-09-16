import { ListingData } from '@/types/listing';

// Enhanced mikvah-specific data structure based on your example
export interface MikvahListingData extends ListingData {
  backButton?: boolean;
  tags?: {
    types?: string[]; // ["Women", "Keilim", "Men"]
    supervisionNote?: string;
  };
  rabbinicAuthority?: string;
  director?: string;
  hours?: {
    women?: {
      appointmentOnly?: boolean;
      bookingLink?: string;
      openTimes?: Array<{ day: string; start: string; end: string }>;
      lastEntryBufferMin?: number;
      seasonalNotes?: string;
      notes?: string;
    };
    men?: {
      openTimes?: Array<{ day: string; start: string; end: string }>;
      erevShabbosExtra?: boolean;
    };
    keilim?: {
      openTimes?: Array<{ day: string; start: string; end: string }>;
      unattended?: boolean;
    };
    timezone?: string;
    lastUpdated?: string;
  };
  pricing?: {
    women?: {
      amount?: number;
      currency?: string;
      includesPrep?: boolean;
      notes?: string;
    };
    men?: {
      amount?: number;
      currency?: string;
    };
    keilim?: {
      amount?: number;
      currency?: string;
      perItem?: boolean;
    };
  };
  amenitiesNote?: string;
  amenitiesSelected?: string[];
  policies?: {
    entryInstructions?: string;
    languageSupport?: string[];
    emergencyAfterHours?: string;
  };
  contacts?: {
    phone?: string;
    website?: string;
  };
  moderation?: {
    verified?: boolean;
    verifiedBy?: string;
    updatedBy?: string;
    updatedAt?: string;
  };
  meta?: {
    slug?: string;
  };
}

interface Mikvah {
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
  reviewcount?: number;
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

export function mapMikvahToListingData(
  mikvah: Mikvah,
  parsedHours?: any,
  distance?: string
): MikvahListingData {
  // Determine the best rating to use
  const rating = mikvah.rating || mikvah.star_rating || mikvah.google_rating || 0;
  const reviewCount = mikvah.reviewcount || 0;

  // Build address string
  const addressParts = [mikvah.address, mikvah.city, mikvah.state, mikvah.zip_code].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  // Build contact information
  const contactInfo = [];
  if (mikvah.phone_number) {
    contactInfo.push({
      type: 'phone',
      label: 'Phone',
      value: mikvah.phone_number,
      href: `tel:${mikvah.phone_number}`
    });
  }
  if (mikvah.appointment_phone && mikvah.appointment_phone !== mikvah.phone_number) {
    contactInfo.push({
      type: 'phone',
      label: 'Appointment Phone',
      value: mikvah.appointment_phone,
      href: `tel:${mikvah.appointment_phone}`
    });
  }
  if (mikvah.website) {
    contactInfo.push({
      type: 'website',
      label: 'Website',
      value: mikvah.website,
      href: mikvah.website.startsWith('http') ? mikvah.website : `https://${mikvah.website}`
    });
  }
  if (mikvah.appointment_website && mikvah.appointment_website !== mikvah.website) {
    contactInfo.push({
      type: 'website',
      label: 'Appointment Website',
      value: mikvah.appointment_website,
      href: mikvah.appointment_website.startsWith('http') ? mikvah.appointment_website : `https://${mikvah.appointment_website}`
    });
  }
  if (mikvah.email) {
    contactInfo.push({
      type: 'email',
      label: 'Email',
      value: mikvah.email,
      href: `mailto:${mikvah.email}`
    });
  }

  // Build features list
  const features = [];
  if (mikvah.has_parking) features.push('Parking Available');
  if (mikvah.has_changing_rooms) features.push('Changing Rooms');
  if (mikvah.has_shower_facilities) features.push('Shower Facilities');
  if (mikvah.has_towels_provided) features.push('Towels Provided');
  if (mikvah.has_soap_provided) features.push('Soap Provided');
  if (mikvah.has_hair_dryers) features.push('Hair Dryers');
  if (mikvah.has_private_entrance) features.push('Private Entrance');
  if (mikvah.has_disabled_access) features.push('Disabled Access');
  if (mikvah.walk_in_available) features.push('Walk-in Available');
  if (mikvah.requires_appointment) features.push('Appointment Required');
  if (mikvah.accepts_credit_cards) features.push('Credit Cards Accepted');
  if (mikvah.accepts_cash) features.push('Cash Accepted');
  if (mikvah.accepts_checks) features.push('Checks Accepted');

  // Build kosher information
  const kosherInfo = [];
  if (mikvah.kosher_certification) {
    kosherInfo.push({
      label: 'Certification',
      value: mikvah.kosher_certification
    });
  }
  if (mikvah.rabbinical_supervision) {
    kosherInfo.push({
      label: 'Rabbinical Supervision',
      value: mikvah.rabbinical_supervision
    });
  }
  if (mikvah.religious_authority) {
    kosherInfo.push({
      label: 'Religious Authority',
      value: mikvah.religious_authority
    });
  }
  if (mikvah.community_affiliation) {
    kosherInfo.push({
      label: 'Community Affiliation',
      value: mikvah.community_affiliation
    });
  }

  // Add fee information if available
  if (mikvah.fee_amount) {
    const currency = mikvah.fee_currency || 'USD';
    const feeText = `$${mikvah.fee_amount.toFixed(2)} ${currency}`;
    kosherInfo.push({
      label: 'Fee',
      value: feeText
    });
  }

  // Parse business hours
  let hoursDisplay = null;
  if (parsedHours) {
    if (typeof parsedHours === 'string') {
      hoursDisplay = parsedHours;
    } else if (typeof parsedHours === 'object') {
      // Format structured hours
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      hoursDisplay = days.map(day => {
        const dayHours = parsedHours[day.toLowerCase()];
        if (dayHours && dayHours !== 'closed') {
          return `${day}: ${dayHours}`;
        } else if (dayHours === 'closed') {
          return `${day}: Closed`;
        }
        return null;
      }).filter(Boolean).join('\n');
    }
  }

  // Add appointment information to description if available
  let enhancedDescription = mikvah.description || '';
  if (mikvah.requires_appointment && mikvah.advance_booking_days) {
    enhancedDescription += `\n\nAppointments required. Book up to ${mikvah.advance_booking_days} days in advance.`;
  } else if (mikvah.walk_in_available) {
    enhancedDescription += '\n\nWalk-ins welcome.';
  }

  // Parse structured hours data for mikvah-specific format
  let mikvahHours: MikvahListingData['hours'] = {};
  if (parsedHours && typeof parsedHours === 'object') {
    mikvahHours = {
      women: {
        appointmentOnly: mikvah.requires_appointment || false,
        bookingLink: mikvah.appointment_website,
        openTimes: [],
        notes: mikvah.requires_appointment ? "Please arrive 15 minutes before appointment." : undefined
      },
      timezone: "America/New_York",
      lastUpdated: mikvah.updated_at
    };
  }

  // Determine mikvah types based on available services
  const mikvahTypes: string[] = [];
  if (mikvah.mikvah_type?.toLowerCase().includes('women') || !mikvah.mikvah_type) {
    mikvahTypes.push('Women');
  }
  if (mikvah.mikvah_type?.toLowerCase().includes('men')) {
    mikvahTypes.push('Men');
  }
  if (features.some(f => f.toLowerCase().includes('keilim'))) {
    mikvahTypes.push('Keilim');
  }

  // Build pricing structure
  const pricing: MikvahListingData['pricing'] = {};
  if (mikvah.fee_amount) {
    const currency = mikvah.fee_currency || 'USD';
    pricing.women = {
      amount: mikvah.fee_amount,
      currency,
      includesPrep: true,
      notes: "Member pricing may be available."
    };
  }

  // Build enhanced listing data
  const baseListingData: ListingData = {
    id: mikvah.id.toString(),
    title: mikvah.name,
    subtitle: mikvah.mikvah_type || mikvah.mikvah_category || 'Mikvah',
    description: enhancedDescription,
    imageUrl: mikvah.image_url || mikvah.logo_url || '/api/placeholder/400/300',
    rating,
    reviewCount,
    distance: distance || mikvah.distance || '',
    address: fullAddress,
    city: mikvah.city || '',
    state: mikvah.state || '',
    zipCode: mikvah.zip_code || '',
    phone: mikvah.phone_number || '',
    website: mikvah.website || '',
    email: mikvah.email || '',
    hours: hoursDisplay,
    contactInfo,
    features,
    kosherInfo,
    tags: mikvah.tags || [],
    specials: mikvah.specials || '',
    isVerified: mikvah.is_verified || false,
    isActive: mikvah.is_active !== false,
    listingType: mikvah.listing_type || 'mikvah',
    coordinates: mikvah.latitude && mikvah.longitude ? {
      latitude: mikvah.latitude,
      longitude: mikvah.longitude
    } : undefined,
    createdAt: mikvah.created_at,
    updatedAt: mikvah.updated_at,
    
    // Enhanced structure for listing utility
    image: {
      src: mikvah.image_url || mikvah.logo_url || '/api/placeholder/400/300',
      alt: `${mikvah.name} mikvah facility`,
      actionLabel: "View Gallery"
    },
    content: {
      leftText: mikvah.name,
      rightText: rating && reviewCount ? `${rating.toFixed(1)} ★ (${reviewCount})` : undefined,
      rightAction: distance || mikvah.zip_code || mikvah.city || '',
      leftBold: true,
      rightBold: false
    },
    actions: {
      primaryAction: mikvah.appointment_website ? {
        label: "Book Appointment",
        onClick: () => window.open(mikvah.appointment_website, '_blank')
      } : undefined,
      secondaryActions: [
        ...(mikvah.website ? [{
          label: "Website",
          onClick: () => window.open(mikvah.website, '_blank')
        }] : []),
        ...(mikvah.phone_number ? [{
          label: "Call",
          onClick: () => window.location.href = `tel:${mikvah.phone_number}`
        }] : [])
      ],
      bottomAction: {
        label: "Hours",
        onClick: () => {
          // Hours popup will be handled by the component
        },
        hoursInfo: {
          title: mikvah.name,
          hours: hoursDisplay ? [{ day: 'General', time: hoursDisplay }] : []
        }
      },
      tags: features.slice(0, 3) // Show top 3 features as tags
    },
    header: {
      title: mikvah.name,
      kosherType: mikvah.kosher_certification,
      viewCount: Math.floor(Math.random() * 2000) + 100, // Mock view count
      shareCount: Math.floor(Math.random() * 200) + 10,   // Mock share count
      isFavorited: false,
      onBack: () => window.history.back()
    }
  };

  // Return enhanced mikvah data
  const mikvahListingData: MikvahListingData = {
    ...baseListingData,
    backButton: true,
    tags: {
      types: mikvahTypes,
      supervisionNote: mikvah.rabbinical_supervision ? `Under ${mikvah.rabbinical_supervision}` : undefined
    },
    rabbinicAuthority: mikvah.rabbinical_supervision,
    director: undefined, // Would need additional data field
    hours: mikvahHours,
    pricing,
    amenitiesNote: features.join(', '),
    amenitiesSelected: features,
    policies: {
      entryInstructions: "Ring front bell; attendant will buzz you in.",
      languageSupport: ["EN"], // Default, would need additional data
      emergencyAfterHours: mikvah.appointment_phone
    },
    contacts: {
      phone: mikvah.phone_number,
      website: mikvah.website
    },
    moderation: {
      verified: mikvah.is_verified,
      verifiedBy: mikvah.is_verified ? "Jewgo Team" : undefined,
      updatedAt: mikvah.updated_at
    },
    meta: {
      slug: mikvah.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }
  };

  return mikvahListingData;
}
