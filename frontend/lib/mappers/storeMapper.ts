import { ListingData } from '@/types/listing';

interface Store {
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
  store_type?: string;
  store_category?: string;
  business_hours?: string;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  reviewcount?: number;
  star_rating?: number;
  google_rating?: number;
  image_url?: string;
  logo_url?: string;
  has_parking?: boolean;
  has_delivery?: boolean;
  has_pickup?: boolean;
  accepts_credit_cards?: boolean;
  accepts_cash?: boolean;
  kosher_certification?: string;
  kosher_category?: string;
  is_cholov_yisroel?: boolean;
  is_pas_yisroel?: boolean;
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

export function mapStoreToListingData(
  store: Store,
  parsedHours?: any,
  distance?: string
): ListingData {
  // Determine the best rating to use
  const rating = store.rating || store.star_rating || store.google_rating || 0;
  const reviewCount = store.reviewcount || 0;

  // Build address string
  const addressParts = [store.address, store.city, store.state, store.zip_code].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  // Build contact information
  const contactInfo = [];
  if (store.phone_number) {
    contactInfo.push({
      type: 'phone',
      label: 'Phone',
      value: store.phone_number,
      href: `tel:${store.phone_number}`
    });
  }
  if (store.website) {
    contactInfo.push({
      type: 'website',
      label: 'Website',
      value: store.website,
      href: store.website.startsWith('http') ? store.website : `https://${store.website}`
    });
  }
  if (store.email) {
    contactInfo.push({
      type: 'email',
      label: 'Email',
      value: store.email,
      href: `mailto:${store.email}`
    });
  }

  // Build features list
  const features = [];
  if (store.has_parking) features.push('Parking Available');
  if (store.has_delivery) features.push('Delivery');
  if (store.has_pickup) features.push('Pickup Available');
  if (store.accepts_credit_cards) features.push('Credit Cards Accepted');
  if (store.accepts_cash) features.push('Cash Accepted');
  if (store.is_cholov_yisroel) features.push('Cholov Yisroel');
  if (store.is_pas_yisroel) features.push('Pas Yisroel');

  // Build kosher information
  const kosherInfo = [];
  if (store.kosher_certification) {
    kosherInfo.push({
      label: 'Certification',
      value: store.kosher_certification
    });
  }
  if (store.kosher_category) {
    kosherInfo.push({
      label: 'Category',
      value: store.kosher_category
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

  return {
    id: store.id.toString(),
    title: store.name,
    subtitle: store.store_type || store.store_category || 'Store',
    description: store.description || '',
    imageUrl: store.image_url || store.logo_url || '/api/placeholder/400/300',
    rating,
    reviewCount,
    distance: distance || store.distance || '',
    address: fullAddress,
    city: store.city || '',
    state: store.state || '',
    zipCode: store.zip_code || '',
    phone: store.phone_number || '',
    website: store.website || '',
    email: store.email || '',
    hours: hoursDisplay,
    contactInfo,
    features,
    kosherInfo,
    tags: store.tags || [],
    specials: store.specials || '',
    isVerified: store.is_verified || false,
    isActive: store.is_active !== false,
    listingType: store.listing_type || 'store',
    coordinates: store.latitude && store.longitude ? {
      latitude: store.latitude,
      longitude: store.longitude
    } : undefined,
    createdAt: store.created_at,
    updatedAt: store.updated_at
  };
}
