// Mock data generator for shuls
export interface MockShul {
  id: string
  name: string
  denomination: "Orthodox" | "Conservative" | "Reform" | "Reconstructionist" | "Chabad" | "Sephardic" | "Modern Orthodox" | "Yeshivish"
  hechsher?: string[]
  neighborhood?: string
  city?: string
  state?: string
  services: string[]
  rating?: number
  review_count?: number
  distance?: number
  is_open_now?: boolean
  next_service?: string
  minyan_times?: {
    shacharit?: string
    mincha?: string
    maariv?: string
  }
  images?: Array<{
    url: string
    is_hero?: boolean
  }>
  features?: string[]
  contact?: {
    phone?: string
    email?: string
    website?: string
  }
}

// Sample data arrays for generating realistic shuls
const shulNames = [
  "Beth Israel",
  "Temple Emanuel",
  "Congregation B'nai Jeshurun",
  "Shaare Zedek",
  "Anshe Emet",
  "Beth Sholom",
  "Temple Sinai",
  "Congregation Rodeph Shalom",
  "Beth El",
  "Temple Beth Am",
  "Shaare Tefilla",
  "Congregation Ahavath Torah",
  "Beth David",
  "Temple Israel",
  "Congregation B'nai Zion",
  "Shaare Chesed",
  "Anshe Sholom",
  "Temple Beth El",
  "Congregation Beth Shalom",
  "Shaare Tzedek",
  "Beth Jacob",
  "Temple Emanu-El",
  "Congregation B'nai Israel",
  "Shaare Emeth",
  "Anshe Chesed",
  "Temple Beth Sholom",
  "Congregation Beth Israel",
  "Shaare Torah",
  "Beth Am",
  "Temple Sinai",
  "Congregation B'nai Jeshurun",
  "Shaare Zedek",
  "Anshe Emet",
  "Temple Beth El",
  "Congregation Rodeph Shalom",
  "Beth Sholom",
  "Shaare Tefilla",
  "Temple Israel",
  "Congregation Ahavath Torah",
  "Beth David",
  "Shaare Chesed",
  "Anshe Sholom",
  "Temple Beth Am",
  "Congregation Beth Shalom",
  "Shaare Tzedek",
  "Beth Jacob",
  "Temple Emanu-El",
  "Congregation B'nai Zion",
  "Shaare Emeth",
  "Anshe Chesed",
  "Temple Beth Sholom",
  "Congregation Beth Israel",
  "Shaare Torah",
  "Beth Am",
  "Temple Sinai",
  "Congregation B'nai Jeshurun",
  "Shaare Zedek",
  "Anshe Emet",
  "Temple Beth El",
  "Congregation Rodeph Shalom",
  "Beth Sholom",
  "Shaare Tefilla",
  "Temple Israel",
  "Congregation Ahavath Torah",
  "Beth David",
  "Shaare Chesed",
  "Anshe Sholom",
  "Temple Beth Am",
  "Congregation Beth Shalom",
  "Shaare Tzedek",
  "Beth Jacob",
  "Temple Emanu-El",
  "Congregation B'nai Zion",
  "Shaare Emeth",
  "Anshe Chesed",
  "Temple Beth Sholom",
  "Congregation Beth Israel",
  "Shaare Torah",
  "Beth Am",
  "Temple Sinai",
  "Congregation B'nai Jeshurun",
  "Shaare Zedek",
  "Anshe Emet",
  "Temple Beth El",
  "Congregation Rodeph Shalom",
  "Beth Sholom",
  "Shaare Tefilla",
  "Temple Israel",
  "Congregation Ahavath Torah",
  "Beth David",
  "Shaare Chesed",
  "Anshe Sholom",
  "Temple Beth Am",
  "Congregation Beth Shalom",
  "Shaare Tzedek",
  "Beth Jacob",
  "Temple Emanu-El",
  "Congregation B'nai Zion",
  "Shaare Emeth",
  "Anshe Chesed",
  "Temple Beth Sholom",
  "Congregation Beth Israel",
  "Shaare Torah",
  "Beth Am"
]

const denominations = [
  "Orthodox",
  "Conservative", 
  "Reform",
  "Reconstructionist",
  "Chabad",
  "Sephardic",
  "Modern Orthodox",
  "Yeshivish"
]

const neighborhoods = [
  "Upper East Side",
  "Upper West Side",
  "Midtown",
  "Downtown",
  "Brooklyn Heights",
  "Park Slope",
  "Williamsburg",
  "Crown Heights",
  "Borough Park",
  "Flatbush",
  "Forest Hills",
  "Queens",
  "Bronx",
  "Staten Island",
  "Manhattan Beach",
  "Brighton Beach",
  "Sheepshead Bay",
  "Mill Basin",
  "Canarsie",
  "East Flatbush"
]

const cities = [
  "New York",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Manhattan",
  "Long Island",
  "Westchester",
  "New Jersey",
  "Connecticut"
]

const states = [
  "NY",
  "NJ",
  "CT",
  "PA",
  "MA",
  "FL",
  "CA",
  "IL",
  "TX",
  "OH"
]

const services = [
  "Daily Minyan",
  "Shabbat Services",
  "Holiday Services",
  "Torah Study",
  "Hebrew School",
  "Adult Education",
  "Youth Programs",
  "Social Events",
  "Kiddush",
  "Community Meals",
  "Mikvah",
  "Library",
  "Gym",
  "Pool",
  "Tennis Courts",
  "Basketball Court",
  "Fitness Center",
  "Childcare",
  "Senior Programs",
  "Outreach Programs"
]

const hechsherOptions = [
  "OU",
  "OK",
  "Star-K",
  "Kof-K",
  "CRC",
  "Vaad HaRabbonim",
  "RCC",
  "KSA",
  "MK",
  "RCC"
]

const features = [
  "Accessible",
  "Parking Available",
  "Public Transportation",
  "Air Conditioning",
  "Heating",
  "WiFi",
  "Audio System",
  "Video System",
  "Kitchen",
  "Social Hall",
  "Conference Rooms",
  "Office Space",
  "Storage",
  "Security System",
  "CCTV",
  "Fire Alarm",
  "Sprinkler System",
  "Generator",
  "Backup Power",
  "Emergency Lighting"
]

// Helper function to get random item from array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// Helper function to get random items from array
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// Helper function to get random number between min and max
function getRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Helper function to get random boolean with probability
function getRandomBoolean(probability: number = 0.5): boolean {
  return Math.random() < probability
}

// Generate a single mock shul
function generateMockShul(id: number): MockShul {
  const denomination = getRandomItem(denominations) as MockShul['denomination']
  const serviceCount = Math.floor(getRandomNumber(3, 8))
  const selectedServices = getRandomItems(services, serviceCount)
  
  // Ensure Orthodox and Chabad shuls have Daily Minyan
  if ((denomination === "Orthodox" || denomination === "Chabad" || denomination === "Modern Orthodox") && 
      !selectedServices.includes("Daily Minyan")) {
    selectedServices[0] = "Daily Minyan"
  }

  const rating = getRandomBoolean(0.8) ? getRandomNumber(3.5, 5.0) : getRandomNumber(2.5, 4.0)
  const reviewCount = Math.floor(getRandomNumber(5, 200))
  const distance = getRandomNumber(0.1, 25.0)
  
  // Generate realistic minyan times for Orthodox shuls
  let minyanTimes = undefined
  if (denomination === "Orthodox" || denomination === "Chabad" || denomination === "Modern Orthodox") {
    minyanTimes = {
      shacharit: getRandomBoolean(0.7) ? "7:00 AM" : "7:30 AM",
      mincha: getRandomBoolean(0.8) ? "1:30 PM" : "2:00 PM",
      maariv: getRandomBoolean(0.9) ? "8:00 PM" : "8:30 PM"
    }
  }

  // Generate hechsher for Orthodox shuls
  let hechsher = undefined
  if (denomination === "Orthodox" || denomination === "Chabad" || denomination === "Modern Orthodox") {
    hechsher = getRandomItems(hechsherOptions, Math.floor(getRandomNumber(1, 3)))
  }

  return {
    id: `shul-${id}`,
    name: getRandomItem(shulNames),
    denomination,
    hechsher,
    neighborhood: getRandomItem(neighborhoods),
    city: getRandomItem(cities),
    state: getRandomItem(states),
    services: selectedServices,
    rating,
    review_count: reviewCount,
    distance,
    is_open_now: getRandomBoolean(0.3),
    next_service: getRandomBoolean(0.4) ? getRandomItem(["Shacharit", "Mincha", "Maariv", "Shabbat Services"]) : undefined,
    minyan_times: minyanTimes,
    images: [
      {
        url: `/shul-${Math.floor(Math.random() * 10) + 1}.jpg`,
        is_hero: true
      }
    ],
    features: getRandomItems(features, Math.floor(getRandomNumber(2, 6))),
    contact: {
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `info@${getRandomItem(shulNames).toLowerCase().replace(/\s+/g, '')}.org`,
      website: `https://www.${getRandomItem(shulNames).toLowerCase().replace(/\s+/g, '')}.org`
    }
  }
}

// Generate multiple mock shuls
export function generateMockShuls(count: number, startId: number = 0): MockShul[] {
  const shuls: MockShul[] = []
  
  for (let i = 0; i < count; i++) {
    shuls.push(generateMockShul(startId + i + 1))
  }
  
  return shuls
}

// Generate exactly 100 mock shuls
export function generateAllMockShuls(): MockShul[] {
  return generateMockShuls(100)
}

// Pre-generate 100 shuls for consistent testing
export const mockShuls = generateAllMockShuls()
