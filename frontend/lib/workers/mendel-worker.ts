/// <reference lib="webworker" />
/* eslint-disable curly, prefer-const */

// Lightweight types mirrored from app models (avoid importing React/Next types here)
type Restaurant = {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number | string;
  longitude?: number | string;
  kosher_category?: string;
  certifying_agency?: string;
  price_range?: string;
  hours_of_operation?: unknown;
  [key: string]: unknown;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type ActiveFilters = {
  agency?: string;
  dietary?: string;
  openNow?: boolean;
  category?: string;
  nearMe?: boolean;
  distanceRadius?: number;
  maxDistance?: number;
  [key: string]: unknown;
};

type FilterRequest = {
  type: 'FILTER_RESTAURANTS';
  payload: {
    restaurants: Restaurant[];
    searchQuery: string;
    activeFilters: ActiveFilters;
    userLocation?: UserLocation | null;
  };
};

type WorkerRequest = FilterRequest;

type WorkerResponse = {
  type: 'FILTER_RESTAURANTS_RESULT';
  payload: {
    restaurants: Restaurant[];
  };
};

const toLower = (v?: string) => (typeof v === 'string' ? v.toLowerCase() : '');

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function timeToMinutes(timeStr: string): number {
  const time = timeStr.toLowerCase().trim();
  const match = time.match(/(\d+):?(\d*)\s*(am|pm)/);
  if (!match || !match[1] || !match[3]) {
    return -1;
  }
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3];
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function passesOpenNow(restaurant: Restaurant): boolean {
  const raw = restaurant.hours_of_operation as unknown;
  if (!raw) {
    return false;
  }
  let hours: any;
  try {
    hours = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return false;
  }
  if (!Array.isArray(hours)) {
    return false;
  }
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const todayHours = hours.find((h: any) => h && toLower(h.day) === currentDay);
  if (!todayHours) {
    return false;
  }
  const openTime = timeToMinutes(String(todayHours.open || ''));
  const closeTime = timeToMinutes(String(todayHours.close || ''));
  if (openTime === -1 || closeTime === -1) return false;
  if (closeTime < openTime) {
    return currentTime >= openTime || currentTime <= closeTime;
  }
  return currentTime >= openTime && currentTime <= closeTime;
}

function filterAndSortRestaurants(
  restaurants: Restaurant[], searchQuery: string, activeFilters: ActiveFilters, userLocation?: UserLocation | null, ): Restaurant[] {
  const query = toLower(searchQuery).trim();
  const agencyQuery = toLower(activeFilters.agency);
  const dietary = toLower(activeFilters.dietary);
  const category = toLower(activeFilters.category);
  const limitDistance = activeFilters.distanceRadius || activeFilters.maxDistance || undefined;

  let filtered = restaurants.filter((restaurant) => {
    // Ensure valid object
    if (!restaurant || typeof restaurant !== 'object') {
      return false;
    }

    // Search query filter
    if (query) {
      const name = toLower(String(restaurant.name || ''));
      const address = toLower(String(restaurant.address || ''));
      const city = toLower(String(restaurant.city || ''));
      const state = toLower(String(restaurant.state || ''));
      const listingType = toLower(String((restaurant as any).listing_type || ''));
      const cert = toLower(String(restaurant.certifying_agency || ''));
      const matches = name.includes(query) || address.includes(query) || city.includes(query) || state.includes(query) || listingType.includes(query) || cert.includes(query);
      if (!matches) {
        return false;
      }
    }

    // Agency filter
    if (agencyQuery) {
      const cert = toLower(String(restaurant.certifying_agency || ''));
      if (!cert.includes(agencyQuery)) {
        return false;
      }
    }

    // Dietary filter
    if (dietary) {
      const kosher = toLower(String(restaurant.kosher_category || ''));
      if (dietary === 'meat' || dietary === 'dairy' || dietary === 'pareve') {
        if (kosher !== dietary) {
          return false;
        }
      }
    }

    // Category filter
    if (category) {
      const listingType = toLower(String((restaurant as any).listing_type || ''));
      if (!listingType.includes(category)) {
        return false;
      }
    }

    // Open now filter
    if (activeFilters.openNow) {
      if (!passesOpenNow(restaurant)) {
        return false;
      }
    }

    // Near me filter
    if (activeFilters.nearMe && userLocation && restaurant.latitude && restaurant.longitude) {
      const lat = Number(restaurant.latitude);
      const lon = Number(restaurant.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return false;
      }
      if (limitDistance) {
        const d = haversineDistance(userLocation.latitude, userLocation.longitude, lat, lon);
        if (d > limitDistance) {
          return false;
        }
      }
    }

    return true;
  });

  // Sort by distance if user location present
  if (userLocation) {
    filtered.sort((a, b) => {
      const aHas = a.latitude && a.longitude;
      const bHas = b.latitude && b.longitude;
      if (!aHas && bHas) {
        return 1;
      }
      if (aHas && !bHas) {
        return -1;
      }
      if (!aHas && !bHas) {
        return 0;
      }
      const aD = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        Number(a.latitude),
        Number(a.longitude)
      );
      const bD = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        Number(b.latitude),
        Number(b.longitude)
      );
      return aD - bD;
    });
  }

  return filtered;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { data } = e as MessageEvent<WorkerRequest>;
  if (!data) {
    console.log('Worker: No data received');
    return;
  }
  if (data.type === 'FILTER_RESTAURANTS') {
    const { restaurants, searchQuery, activeFilters, userLocation } = data.payload;
    
    console.log('Worker: Filtering restaurants:', {
      inputCount: (restaurants || []).length,
      searchQuery: searchQuery || '',
      activeFilters: activeFilters || {},
      hasUserLocation: !!userLocation,
      firstRestaurant: restaurants?.[0] ? {
        id: restaurants[0].id,
        name: restaurants[0].name,
        lat: restaurants[0].latitude,
        lng: restaurants[0].longitude
      } : null
    });
    
    try {
      const result = filterAndSortRestaurants(restaurants || [], searchQuery || '', activeFilters || {}, userLocation);
      
      console.log('Worker: Filter result:', {
        resultCount: result.length,
        firstResult: result[0] ? {
          id: result[0].id,
          name: result[0].name,
          lat: result[0].latitude,
          lng: result[0].longitude
        } : null
      });
      
      const message: WorkerResponse = {
        type: 'FILTER_RESTAURANTS_RESULT',
        payload: { restaurants: result },
      };
      (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
    } catch (err) {
      console.error('Worker: Error filtering restaurants:', err);
      const message: WorkerResponse = {
        type: 'FILTER_RESTAURANTS_RESULT',
        payload: { restaurants: restaurants || [] },
      };
      (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
    }
  }
};
