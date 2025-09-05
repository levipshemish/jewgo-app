// Mock data generator for restaurants
export interface MockRestaurant {
  id: string
  name: string
  address: string
  image_url?: string
  price_range?: string
  google_rating?: number
  kosher_category?: string
  cuisine?: string
  is_open?: boolean
  latitude?: number
  longitude?: number
  distance?: number
}

// Sample data arrays for generating realistic restaurants
const restaurantNames = [
  "Kosher Corner",
  "Mazal Tov Deli",
  "Shalom Restaurant",
  "Beth Israel Kitchen",
  "Kosher Express",
  "Mazal Cafe",
  "Shabbat Table",
  "Kosher Kitchen",
  "Mazal Grill",
  "Shalom Deli",
  "Kosher Bistro",
  "Mazal Pizza",
  "Shabbat Kitchen",
  "Kosher Market",
  "Mazal Bakery",
  "Shalom Cafe",
  "Kosher Corner Deli",
  "Mazal Restaurant",
  "Shabbat Express",
  "Kosher Grill",
  "Mazal Kitchen",
  "Shalom Pizza",
  "Kosher Cafe",
  "Mazal Deli",
  "Shabbat Corner",
  "Kosher Bakery",
  "Mazal Express",
  "Shalom Kitchen",
  "Kosher Pizza",
  "Mazal Corner",
  "Shabbat Deli",
  "Kosher Express Cafe",
  "Mazal Bakery Corner",
  "Shalom Grill",
  "Kosher Kitchen Express",
  "Mazal Pizza Corner",
  "Shabbat Cafe",
  "Kosher Deli Express",
  "Mazal Kitchen Corner",
  "Shalom Bakery",
  "Kosher Grill Express",
  "Mazal Deli Corner",
  "Shabbat Kitchen Express",
  "Kosher Pizza Corner",
  "Mazal Cafe Express",
  "Shalom Corner",
  "Kosher Bakery Express",
  "Mazal Grill Corner",
  "Shabbat Deli Express",
  "Kosher Kitchen Corner"
]

const kosherCategories = [
  "Glatt Kosher",
  "Kosher",
  "Kosher Dairy",
  "Kosher Meat",
  "Kosher Pareve",
  "Kosher Fish",
  "Kosher Bakery",
  "Kosher Deli",
  "Kosher Pizza",
  "Kosher Chinese",
  "Kosher Italian",
  "Kosher Mediterranean",
  "Kosher American",
  "Kosher Mexican",
  "Kosher Asian",
  "Kosher Sushi",
  "Kosher Steakhouse",
  "Kosher Cafe",
  "Kosher Fast Food",
  "Kosher Fine Dining"
]

const cuisines = [
  "American",
  "Italian",
  "Chinese",
  "Mediterranean",
  "Mexican",
  "Asian",
  "Sushi",
  "Steakhouse",
  "Cafe",
  "Fast Food",
  "Fine Dining",
  "Deli",
  "Pizza",
  "Bakery",
  "Seafood",
  "Vegetarian",
  "Vegan",
  "Middle Eastern",
  "European",
  "Fusion"
]

const priceRanges = [
  "$",
  "$$",
  "$$$",
  "$$$$"
]

const addresses = [
  "123 Main St, Brooklyn, NY 11201",
  "456 Park Ave, Manhattan, NY 10001",
  "789 Broadway, Queens, NY 11101",
  "321 5th Ave, Brooklyn, NY 11215",
  "654 Lexington Ave, Manhattan, NY 10022",
  "987 3rd Ave, Queens, NY 11106",
  "147 2nd Ave, Brooklyn, NY 11218",
  "258 6th Ave, Manhattan, NY 10014",
  "369 7th Ave, Queens, NY 11103",
  "741 8th Ave, Brooklyn, NY 11220",
  "852 9th Ave, Manhattan, NY 10019",
  "963 10th Ave, Queens, NY 11104",
  "159 11th Ave, Brooklyn, NY 11219",
  "357 12th Ave, Manhattan, NY 10023",
  "468 13th Ave, Queens, NY 11105",
  "579 14th Ave, Brooklyn, NY 11221",
  "680 15th Ave, Manhattan, NY 10024",
  "791 16th Ave, Queens, NY 11107",
  "802 17th Ave, Brooklyn, NY 11222",
  "913 18th Ave, Manhattan, NY 10025"
]

// Helper function to get random item from array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// Helper function to get random number between min and max
function getRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Helper function to get random boolean with probability
function getRandomBoolean(probability: number = 0.5): boolean {
  return Math.random() < probability
}

// Generate a single mock restaurant
function generateMockRestaurant(id: number): MockRestaurant {
  const rating = getRandomBoolean(0.8) ? getRandomNumber(3.5, 5.0) : getRandomNumber(2.5, 4.0)
  const distance = getRandomNumber(0.1, 25.0)
  
  // Generate realistic coordinates for NYC area
  const latitude = getRandomNumber(40.4774, 40.9176) // NYC latitude range
  const longitude = getRandomNumber(-74.2591, -73.7004) // NYC longitude range

  return {
    id: `restaurant-${id}`,
    name: getRandomItem(restaurantNames),
    address: getRandomItem(addresses),
    image_url: `/restaurant-${Math.floor(Math.random() * 10) + 1}.jpg`,
    price_range: getRandomItem(priceRanges),
    google_rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
    kosher_category: getRandomItem(kosherCategories),
    cuisine: getRandomItem(cuisines),
    is_open: getRandomBoolean(0.7), // 70% chance of being open
    latitude,
    longitude,
    distance
  }
}

// Generate multiple mock restaurants
export function generateMockRestaurants(count: number, startId: number = 0): MockRestaurant[] {
  const restaurants: MockRestaurant[] = []
  
  for (let i = 0; i < count; i++) {
    restaurants.push(generateMockRestaurant(startId + i + 1))
  }
  
  return restaurants
}

// Generate exactly 100 mock restaurants
export function generateAllMockRestaurants(): MockRestaurant[] {
  return generateMockRestaurants(100)
}

// Pre-generate 100 restaurants for consistent testing
export const mockRestaurants = generateAllMockRestaurants()
