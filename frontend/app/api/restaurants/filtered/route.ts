import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

interface FilterParams {
  searchQuery?: string;
  agency?: string;
  dietary?: string;
  category?: string;
  nearMe?: boolean;
  maxDistance?: number;
  openNow?: boolean;
  userLat?: number;
  userLng?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'distance' | 'name' | 'rating';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract filter parameters
    const filters: FilterParams = {
      searchQuery: searchParams.get('searchQuery') || undefined,
      agency: searchParams.get('agency') || undefined,
      dietary: searchParams.get('dietary') || undefined,
      category: searchParams.get('category') || undefined,
      nearMe: searchParams.get('nearMe') === 'true',
      maxDistance: searchParams.get('maxDistance') ? parseInt(searchParams.get('maxDistance')!) : undefined,
      openNow: searchParams.get('openNow') === 'true',
      userLat: searchParams.get('userLat') ? parseFloat(searchParams.get('userLat')!) : undefined,
      userLng: searchParams.get('userLng') ? parseFloat(searchParams.get('userLng')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sortBy: (searchParams.get('sortBy') as 'distance' | 'name' | 'rating') || 'distance'
    };

    // Build backend API URL with filters
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    const backendParams = new URLSearchParams();

    // Add filters to backend request
    if (filters.searchQuery) {
      backendParams.append('search', filters.searchQuery);
    }
    if (filters.agency) {
      backendParams.append('certifying_agency', filters.agency);
    }
    if (filters.dietary) {
      backendParams.append('kosher_category', filters.dietary);
    }
    if (filters.category) {
      backendParams.append('listing_type', filters.category);
    }
    if (filters.nearMe && filters.userLat && filters.userLng) {
      backendParams.append('latitude', filters.userLat.toString());
      backendParams.append('longitude', filters.userLng.toString());
      backendParams.append('radius', (filters.maxDistance || 10).toString());
    }
    if (filters.openNow) {
      backendParams.append('open_now', 'true');
    }
    if (filters.limit) {
      backendParams.append('limit', filters.limit.toString());
    }
    if (filters.offset) {
      backendParams.append('offset', filters.offset.toString());
    }
    if (filters.sortBy) {
      backendParams.append('sort_by', filters.sortBy);
    }

    // Fetch filtered data from backend
    const backendResponse = await fetch(`${backendUrl}/api/restaurants?${backendParams.toString()}`);
    
    if (!backendResponse.ok) {
      throw new Error(`Backend API error: ${backendResponse.status}`);
    }

    const data = await backendResponse.json();
    
    // Process and enhance the response
    const restaurants = data.restaurants || data.data || [];
    
    // Apply additional client-side filters if needed (for complex logic)
    let filteredRestaurants = restaurants;

    // Apply "open now" filter if not handled by backend
    if (filters.openNow && !backendParams.has('open_now')) {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      filteredRestaurants = filteredRestaurants.filter((restaurant: any) => {
        if (!restaurant.hours_of_operation) {
          return false;
        }

        try {
          const hours = typeof restaurant.hours_of_operation === 'string'
            ? JSON.parse(restaurant.hours_of_operation)
            : restaurant.hours_of_operation;

          if (!Array.isArray(hours)) {
            return false;
          }

          const todayHours = hours.find((h: any) => h.day === currentDay);
          if (!todayHours) {
            return false;
          }

          const openTime = timeToMinutes(todayHours.open);
          const closeTime = timeToMinutes(todayHours.close);

          if (openTime === -1 || closeTime === -1) {
            return false;
          }

          // Handle past midnight
          if (closeTime < openTime) {
            return currentTime >= openTime || currentTime <= closeTime;
          } else {
            return currentTime >= openTime && currentTime <= closeTime;
          }
        } catch {
          return false;
        }
      });
    }

    // Calculate distances for sorting if needed
    if (filters.userLat && filters.userLng && filters.sortBy === 'distance') {
      filteredRestaurants = filteredRestaurants.map((restaurant: any) => ({
        ...restaurant,
        distance: calculateDistance(
          filters.userLat!,
          filters.userLng!,
          restaurant.latitude,
          restaurant.longitude
        )
      })).sort((a: any, b: any) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurants: filteredRestaurants,
        total: data.total || filteredRestaurants.length,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: (filters.offset || 0) + (filters.limit || 100) < (data.total || filteredRestaurants.length),
        filters
      }
    });

  } catch (_error) {
    // console.error('Error in filtered restaurants API:', _error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch filtered restaurants',
      message: _error instanceof Error ? _error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to convert time string to minutes
function timeToMinutes(timeStr: string): number {
  const time = timeStr.toLowerCase().trim();
  const match = time.match(/(\d+):?(\d*)\s*(am|pm)/);
  
  if (!match || !match[1] || !match[3]) {
    return -1;
  }
  
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3];
  
  if (period === 'pm' && hours !== 12) {
    hours += 12;
  }
  if (period === 'am' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat2 || !lon2) {
    return Infinity;
  }
  
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
