import { ListingData } from '@/types/listing';

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
): ListingData {
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

  return {
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
    updatedAt: mikvah.updated_at
  };
}
