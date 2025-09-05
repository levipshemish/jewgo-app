// Mock data generator for stores
export interface MockStore {
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
}

const storeNames = [
  "Kosher Corner Market",
  "Shalom Supermarket",
  "Mazel Tov Deli",
  "Chai Grocery",
  "B'ezrat Hashem Bakery",
  "Kosher King",
  "Shabbat Shalom Store",
  "Mitzvah Market",
  "Kedoshim Kosher",
  "Tzadik Trading",
  "Chassidim Corner",
  "Kosher Express",
  "Shul Store",
  "Mikvah Market",
  "Kosher Kitchen",
  "Jewish Junction",
  "Kosher Central",
  "Shabbat Store",
  "Kosher Plus",
  "Jewish Market"
];

const storeTypes = [
  "Grocery Store",
  "Supermarket",
  "Deli",
  "Bakery",
  "Butcher Shop",
  "Kosher Market",
  "Convenience Store",
  "Specialty Store",
  "Health Food Store",
  "Organic Market"
];

const kosherCategories = [
  "Dairy",
  "Meat",
  "Pareve",
  "Glatt Kosher",
  "Cholov Yisroel",
  "Pas Yisroel",
  "Bishul Yisroel",
  "Yoshon",
  "Chalav Yisroel"
];

const cities = [
  "Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island",
  "Miami", "Boca Raton", "Aventura", "Hollywood", "Fort Lauderdale",
  "Los Angeles", "Beverly Hills", "West Hollywood", "Santa Monica",
  "Chicago", "Skokie", "Highland Park", "Deerfield",
  "Boston", "Newton", "Brookline", "Cambridge"
];

const states = ["NY", "FL", "CA", "IL", "MA", "NJ", "CT", "MD", "PA"];

const kosherCertifications = [
  "OU", "OK", "Kof-K", "Star-K", "CRC", "Vaad HaRabbonim", "MK", "Chabad"
];

export function generateMockStores(count: number): MockStore[] {
  const stores: MockStore[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = 1000 + i;
    const name = storeNames[i % storeNames.length];
    const storeType = storeTypes[Math.floor(Math.random() * storeTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const kosherCategory = kosherCategories[Math.floor(Math.random() * kosherCategories.length)];
    const kosherCert = kosherCertifications[Math.floor(Math.random() * kosherCertifications.length)];
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0 to 5.0
    const reviewCount = Math.floor(Math.random() * 200) + 10;
    const distance = Math.round((Math.random() * 15 + 0.5) * 10) / 10; // 0.5 to 15.5 miles
    
    stores.push({
      id,
      name: `${name} ${i > 0 ? i + 1 : ''}`.trim(),
      description: `A ${storeType.toLowerCase()} offering fresh kosher products and groceries.`,
      address: `${Math.floor(Math.random() * 9999) + 1} Main St`,
      city,
      state,
      zip_code: `${Math.floor(Math.random() * 90000) + 10000}`,
      phone_number: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
      email: `info@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      store_type: storeType,
      store_category: "Kosher",
      business_hours: "Mon-Thu: 8AM-8PM, Fri: 8AM-3PM, Sun: 9AM-7PM",
      distance: `${distance} mi`,
      distance_miles: distance,
      rating,
      reviewcount: reviewCount,
      star_rating: rating,
      google_rating: rating,
      image_url: `https://picsum.photos/400/300?random=${id}`,
      logo_url: `https://picsum.photos/100/100?random=${id + 1000}`,
      has_parking: Math.random() > 0.3,
      has_delivery: Math.random() > 0.5,
      has_pickup: Math.random() > 0.2,
      accepts_credit_cards: true,
      accepts_cash: true,
      kosher_certification: kosherCert,
      kosher_category: kosherCategory,
      is_cholov_yisroel: kosherCategory === "Cholov Yisroel" || Math.random() > 0.7,
      is_pas_yisroel: kosherCategory === "Pas Yisroel" || Math.random() > 0.6,
      is_active: true,
      is_verified: Math.random() > 0.2,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: [storeType, kosherCategory, "Kosher", "Jewish"],
      admin_notes: "",
      specials: Math.random() > 0.7 ? "Weekly specials available" : "",
      listing_type: "store"
    });
  }
  
  return stores;
}
