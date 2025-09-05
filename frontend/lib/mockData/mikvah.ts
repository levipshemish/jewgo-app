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
  has_attendant?: boolean;
  has_private_rooms?: boolean;
  has_heating?: boolean;
  has_air_conditioning?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
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
    
    mikvahs.push({
      id,
      name: `${name} ${i > 0 ? i + 1 : ''}`.trim(),
      description: `A ${mikvahType.toLowerCase()} providing traditional mikvah services for the Jewish community.`,
      address: `${Math.floor(Math.random() * 9999) + 1} Jewish Way`,
      city,
      state,
      zip_code: `${Math.floor(Math.random() * 90000) + 10000}`,
      phone_number: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
      email: `info@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      mikvah_type: mikvahType,
      mikvah_category: "Mikvah",
      business_hours: "Sun-Thu: 7AM-10PM, Fri: 7AM-2PM, Sat: 8PM-11PM",
      distance: `${distance} mi`,
      distance_miles: distance,
      rating,
      reviewcount: reviewCount,
      star_rating: rating,
      google_rating: rating,
      image_url: `https://picsum.photos/400/300?random=${id}`,
      logo_url: `https://picsum.photos/100/100?random=${id + 2000}`,
      has_parking: Math.random() > 0.2,
      has_disabled_access: Math.random() > 0.3,
      has_attendant: Math.random() > 0.1,
      has_private_rooms: Math.random() > 0.1,
      has_heating: Math.random() > 0.1,
      has_air_conditioning: Math.random() > 0.2,
      is_active: true,
      is_verified: Math.random() > 0.1,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: [mikvahType, "Mikvah", "Jewish", "Religious"],
      admin_notes: "",
      specials: Math.random() > 0.8 ? "Special hours for holidays" : "",
      listing_type: "mikvah"
    });
  }
  
  return mikvahs;
}
