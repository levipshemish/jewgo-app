// Mock data generator for mikvah facilities
export interface MockMikvah {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
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
  zip_code?: string;
}

const mikvahNames = [
  "Community Mikvah",
  "Shul Mikvah",
  "Kosher Mikvah",
  "Taharas Mikvah",
  "Mikvah Israel",
  "Community Center Mikvah",
  "Synagogue Mikvah",
  "Jewish Center Mikvah",
  "Temple Mikvah",
  "Chabad Mikvah",
  "Orthodox Mikvah",
  "Conservative Mikvah",
  "Reform Mikvah",
  "Modern Orthodox Mikvah",
  "Sephardic Mikvah",
  "Ashkenazi Mikvah",
  "Hasidic Mikvah",
  "Yeshiva Mikvah",
  "Community Mikvah Center",
  "Jewish Community Mikvah"
];

const mikvahTypes = [
  "Community Mikvah",
  "Synagogue Mikvah",
  "Private Mikvah",
  "Public Mikvah",
  "Hotel Mikvah",
  "Resort Mikvah",
  "Educational Mikvah",
  "Therapeutic Mikvah"
];

const cities = [
  "Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island",
  "Miami", "Boca Raton", "Aventura", "Hollywood", "Fort Lauderdale",
  "Los Angeles", "Beverly Hills", "West Hollywood", "Santa Monica",
  "Chicago", "Skokie", "Highland Park", "Deerfield",
  "Boston", "Newton", "Brookline", "Cambridge"
];

const states = ["NY", "FL", "CA", "IL", "MA", "NJ", "CT", "MD", "PA"];

export function generateMockMikvah(count: number): MockMikvah[] {
  const mikvahs: MockMikvah[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = 2000 + i;
    const name = mikvahNames[i % mikvahNames.length];
    const mikvahType = mikvahTypes[Math.floor(Math.random() * mikvahTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0 to 5.0
    const reviewCount = Math.floor(Math.random() * 100) + 5;
    const distance = Math.round((Math.random() * 20 + 0.5) * 10) / 10; // 0.5 to 20.5 miles
    
    // Generate realistic coordinates for different cities
    const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
      "Brooklyn": { lat: 40.6782, lng: -73.9442 },
      "Queens": { lat: 40.7282, lng: -73.7949 },
      "Manhattan": { lat: 40.7831, lng: -73.9712 },
      "Bronx": { lat: 40.8448, lng: -73.8648 },
      "Staten Island": { lat: 40.5795, lng: -74.1502 },
      "Miami": { lat: 25.7617, lng: -80.1918 },
      "Boca Raton": { lat: 26.3683, lng: -80.1289 },
      "Aventura": { lat: 25.9564, lng: -80.1393 },
      "Hollywood": { lat: 26.0112, lng: -80.1495 },
      "Fort Lauderdale": { lat: 26.1224, lng: -80.1373 },
      "Los Angeles": { lat: 34.0522, lng: -118.2437 },
      "Beverly Hills": { lat: 34.0736, lng: -118.4004 },
      "West Hollywood": { lat: 34.0900, lng: -118.3617 },
      "Santa Monica": { lat: 34.0195, lng: -118.4912 },
      "Chicago": { lat: 41.8781, lng: -87.6298 },
      "Skokie": { lat: 42.0334, lng: -87.7334 },
      "Highland Park": { lat: 42.1817, lng: -87.8006 },
      "Deerfield": { lat: 42.1711, lng: -87.8445 },
      "Boston": { lat: 42.3601, lng: -71.0589 },
      "Newton": { lat: 42.3370, lng: -71.2092 },
      "Brookline": { lat: 42.3318, lng: -71.1211 },
      "Cambridge": { lat: 42.3736, lng: -71.1097 }
    };
    
    const baseCoords = cityCoordinates[city] || { lat: 40.7831, lng: -73.9712 }; // Default to Manhattan
    // Add some random variation within the city (±0.05 degrees ≈ ±3 miles)
    const latitude = baseCoords.lat + (Math.random() - 0.5) * 0.1;
    const longitude = baseCoords.lng + (Math.random() - 0.5) * 0.1;
    const zipCode = `${Math.floor(Math.random() * 90000) + 10000}`;
    
    mikvahs.push({
      id,
      name: `${name} ${i > 0 ? i + 1 : ''}`.trim(),
      description: `A ${mikvahType.toLowerCase()} providing traditional mikvah services for the Jewish community.`,
      address: `${Math.floor(Math.random() * 9999) + 1} Jewish Way`,
      city,
      state,
      phone_number: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
      email: `info@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      mikvah_type: mikvahType,
      mikvah_category: "Mikvah",
      business_hours: "Sun-Thu: 7AM-10PM, Fri: 7AM-2PM, Sat: 8PM-11PM",
      requires_appointment: Math.random() > 0.3,
      appointment_phone: Math.random() > 0.5 ? `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}` : undefined,
      appointment_website: Math.random() > 0.7 ? `https://${name.toLowerCase().replace(/\s+/g, '')}.com/appointments` : undefined,
      walk_in_available: Math.random() > 0.4,
      advance_booking_days: Math.floor(Math.random() * 14) + 1,
      distance: `${distance} mi`,
      distance_miles: distance,
      rating,
      reviewcount: reviewCount,
      star_rating: rating,
      google_rating: rating,
      image_url: `https://picsum.photos/400/300?random=${id}`,
      logo_url: `https://picsum.photos/100/100?random=${id + 2000}`,
      has_changing_rooms: Math.random() > 0.1,
      has_shower_facilities: Math.random() > 0.1,
      has_towels_provided: Math.random() > 0.3,
      has_soap_provided: Math.random() > 0.2,
      has_hair_dryers: Math.random() > 0.4,
      has_private_entrance: Math.random() > 0.2,
      has_disabled_access: Math.random() > 0.3,
      has_parking: Math.random() > 0.2,
      rabbinical_supervision: Math.random() > 0.1 ? "Local Rabbi" : undefined,
      kosher_certification: Math.random() > 0.2 ? "OU" : undefined,
      community_affiliation: Math.random() > 0.3 ? "Local Community" : undefined,
      religious_authority: Math.random() > 0.2 ? "Orthodox" : undefined,
      fee_amount: Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 10 : undefined,
      fee_currency: "USD",
      accepts_credit_cards: Math.random() > 0.3,
      accepts_cash: true,
      accepts_checks: Math.random() > 0.4,
      is_active: true,
      is_verified: Math.random() > 0.1,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: [mikvahType, "Mikvah", "Jewish", "Religious"],
      admin_notes: "",
      specials: Math.random() > 0.8 ? "Special hours for holidays" : "",
      listing_type: "mikvah",
      latitude,
      longitude,
      zip_code: zipCode
    });
  }
  
  return mikvahs;
}
