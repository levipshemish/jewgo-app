// Mock data generator for shtetl listings
export interface MockShtetl {
  id: number;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  website?: string;
  email?: string;
  listing_type?: string;
  category?: string;
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
  has_disabled_access?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  price_range?: string;
  amenities?: string[];
}

const shtetlTitles = [
  "Historic Jewish Quarter",
  "Old Jewish District",
  "Jewish Heritage Center",
  "Shtetl Museum",
  "Jewish Cultural Center",
  "Heritage Square",
  "Jewish Historical Site",
  "Community Center",
  "Jewish Arts Center",
  "Cultural Heritage Site",
  "Jewish Learning Center",
  "Community Hall",
  "Jewish Theater",
  "Cultural Museum",
  "Heritage Building",
  "Jewish Library",
  "Community Space",
  "Cultural Venue",
  "Historical Building",
  "Jewish Center"
];

const listingTypes = [
  "Cultural Center",
  "Museum",
  "Historical Site",
  "Community Center",
  "Arts Center",
  "Learning Center",
  "Theater",
  "Library",
  "Heritage Site",
  "Cultural Venue"
];

const categories = [
  "Cultural",
  "Historical",
  "Educational",
  "Community",
  "Arts",
  "Heritage",
  "Religious",
  "Social",
  "Entertainment",
  "Tourism"
];

const cities = [
  "Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island",
  "Miami", "Boca Raton", "Aventura", "Hollywood", "Fort Lauderdale",
  "Los Angeles", "Beverly Hills", "West Hollywood", "Santa Monica",
  "Chicago", "Skokie", "Highland Park", "Deerfield",
  "Boston", "Newton", "Brookline", "Cambridge"
];

const states = ["NY", "FL", "CA", "IL", "MA", "NJ", "CT", "MD", "PA"];

const amenities = [
  "Parking",
  "Wheelchair Accessible",
  "WiFi",
  "Air Conditioning",
  "Heating",
  "Restrooms",
  "Gift Shop",
  "Café",
  "Library",
  "Meeting Rooms",
  "Event Space",
  "Audio/Visual Equipment",
  "Guided Tours",
  "Educational Programs",
  "Cultural Events"
];

export function generateMockShtetl(count: number): MockShtetl[] {
  const shtetls: MockShtetl[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = 3000 + i;
    const title = shtetlTitles[i % shtetlTitles.length];
    const listingType = listingTypes[Math.floor(Math.random() * listingTypes.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0 to 5.0
    const reviewCount = Math.floor(Math.random() * 150) + 5;
    const distance = Math.round((Math.random() * 25 + 0.5) * 10) / 10; // 0.5 to 25.5 miles
    
    // Generate random amenities
    const numAmenities = Math.floor(Math.random() * 8) + 3; // 3-10 amenities
    const selectedAmenities = amenities
      .sort(() => 0.5 - Math.random())
      .slice(0, numAmenities);
    
    shtetls.push({
      id,
      title: `${title} ${i > 0 ? i + 1 : ''}`.trim(),
      description: `A ${listingType.toLowerCase()} dedicated to preserving and celebrating Jewish heritage and culture.`,
      address: `${Math.floor(Math.random() * 9999) + 1} Heritage Blvd`,
      city,
      state,
      zip_code: `${Math.floor(Math.random() * 90000) + 10000}`,
      phone_number: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      website: `https://${title.toLowerCase().replace(/\s+/g, '')}.com`,
      email: `info@${title.toLowerCase().replace(/\s+/g, '')}.com`,
      listing_type: listingType,
      category,
      business_hours: "Mon-Fri: 9AM-5PM, Sat: 10AM-4PM, Sun: 12PM-4PM",
      distance: `${distance} mi`,
      distance_miles: distance,
      rating,
      reviewcount: reviewCount,
      star_rating: rating,
      google_rating: rating,
      image_url: `https://picsum.photos/400/300?random=${id}`,
      logo_url: `https://picsum.photos/100/100?random=${id + 3000}`,
      has_parking: Math.random() > 0.3,
      has_disabled_access: Math.random() > 0.2,
      is_active: true,
      is_verified: Math.random() > 0.1,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: [listingType, category, "Jewish", "Cultural", "Heritage"],
      admin_notes: "",
      specials: Math.random() > 0.7 ? "Special events and programs available" : "",
      price_range: Math.random() > 0.5 ? "Free" : "$5-$15",
      amenities: selectedAmenities
    });
  }
  
  return shtetls;
}
