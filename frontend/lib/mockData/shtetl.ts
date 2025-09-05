// Mock data generator for shtetl listings
export interface MockShtetl {
  id: number;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  condition?: string;
  location?: string;
  city?: string;
  state?: string;
  seller_name?: string;
  seller_phone?: string;
  seller_email?: string;
  images?: string[];
  image_url?: string;
  is_active?: boolean;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  distance?: string;
  distance_miles?: number;
  rating?: number;
  reviewcount?: number;
}

const shtetlTitles = [
  "Vintage Menorah",
  "Antique Torah Scroll",
  "Handmade Challah Cover",
  "Silver Kiddush Cup",
  "Jewish Art Print",
  "Hebrew Prayer Book",
  "Shabbat Candlesticks",
  "Mezuzah Case",
  "Jewish Cookbook",
  "Vintage Jewish Postcard",
  "Tallit Prayer Shawl",
  "Jewish Calendar",
  "Hanukkah Menorah",
  "Jewish Jewelry",
  "Hebrew Learning Book",
  "Jewish Music CD",
  "Seder Plate",
  "Jewish Children's Book",
  "Jewish Artwork",
  "Kosher Cookbook"
];

const categories = [
  "Religious Items",
  "Books",
  "Art & Collectibles",
  "Jewelry",
  "Home & Garden",
  "Clothing",
  "Electronics",
  "Toys & Games",
  "Sports & Outdoors",
  "Health & Beauty"
];

const conditions = [
  "New",
  "Like New",
  "Good",
  "Fair",
  "Used"
];

const cities = [
  "Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island",
  "Miami", "Boca Raton", "Aventura", "Hollywood", "Fort Lauderdale",
  "Los Angeles", "Beverly Hills", "West Hollywood", "Santa Monica",
  "Chicago", "Skokie", "Highland Park", "Deerfield",
  "Boston", "Newton", "Brookline", "Cambridge"
];

const states = ["NY", "FL", "CA", "IL", "MA", "NJ", "CT", "MD", "PA"];


export function generateMockShtetl(count: number): MockShtetl[] {
  const shtetls: MockShtetl[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = 3000 + i;
    const title = shtetlTitles[i % shtetlTitles.length];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0 to 5.0
    const reviewCount = Math.floor(Math.random() * 150) + 5;
    const distance = Math.round((Math.random() * 25 + 0.5) * 10) / 10; // 0.5 to 25.5 miles
    const price = Math.floor(Math.random() * 500) + 10; // $10-$510
    
    shtetls.push({
      id,
      title: `${title} ${i > 0 ? i + 1 : ''}`.trim(),
      description: `Beautiful ${title.toLowerCase()} in ${condition.toLowerCase()} condition. Perfect for your Jewish home or collection.`,
      price,
      currency: "USD",
      category,
      subcategory: category,
      condition,
      location: `${city}, ${state}`,
      city,
      state,
      seller_name: `Seller ${i + 1}`,
      seller_phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      seller_email: `seller${i + 1}@example.com`,
      images: [`https://picsum.photos/400/300?random=${id}`],
      image_url: `https://picsum.photos/400/300?random=${id}`,
      is_active: true,
      is_featured: Math.random() > 0.8,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: [category, condition, "Jewish", "Religious", "Collectible"],
      distance: `${distance} mi`,
      distance_miles: distance,
      rating,
      reviewcount: reviewCount
    });
  }
  
  return shtetls;
}
