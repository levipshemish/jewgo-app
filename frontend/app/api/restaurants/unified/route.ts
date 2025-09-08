import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for unified responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes for unified data
const _FILTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for filter options

// In-flight request deduplication
const inflight = new Map<string, Promise<{ payload: any; headers: Record<string, string>; status?: number }>>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Create cache key from all relevant parameters
    const cacheKey = `unified-${searchParams.toString()}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=120', // 2 minutes browser cache
          'CDN-Cache-Control': 'public, max-age=120',
          'Vercel-CDN-Cache-Control': 'public, max-age=120',
          'X-Cache': 'HIT'
        }
      });
    }

    // If an identical request is already being processed, reuse its result
    const existing = inflight.get(cacheKey);
    if (existing) {
      const { payload, headers, status } = await existing;
      return NextResponse.json(payload, { headers, status });
    }

    // Create in-flight promise
    const p = (async (): Promise<{ payload: any; headers: Record<string, string>; status?: number }> => {
      // Get backend URL
      const _backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.jewgo.app';
      
      // Build unified backend request parameters
      const backendParams = new URLSearchParams();
      
      // Copy all relevant parameters to backend request
      const relevantParams = [
        'limit', 'offset', 'search', 'city', 'state', 'certifying_agency', 
        'kosher_category', 'is_cholov_yisroel', 'listing_type', 'price_min', 
        'price_max', 'min_rating', 'has_reviews', 'open_now', 'status', 
        'lat', 'lng', 'max_distance_mi', 'sortBy', 'dietary', 'include_reviews',
        // Forward viewport bounds for map-based loading
        'bounds_ne_lat', 'bounds_ne_lng', 'bounds_sw_lat', 'bounds_sw_lng'
      ];
      
      relevantParams.forEach(param => {
        const value = searchParams.get(param);
        if (value) {
          backendParams.append(param, value);
        }
      });
      
      // Handle multiple dietary filters
      const dietaries = searchParams.getAll('dietary');
      dietaries.forEach(dietary => {
        backendParams.append('dietary', dietary);
      });

              // Make single unified backend call
              const backendResponse = await fetch(`${_backendUrl}/api/restaurants?${backendParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!backendResponse.ok) {
        // Fallback to separate calls if unified endpoint doesn't exist
        return await fallbackToSeparateCalls(searchParams, _backendUrl);
      }

      const backendData = await backendResponse.json();
      
      const _items = backendData.items || backendData.restaurants || [];
      
      // Transform response to match frontend expectations
      // Backend returns 'items' array, but frontend expects 'restaurants'
      const restaurants = backendData.items || backendData.restaurants || [];
      
      const unifiedResponse = {
        success: true,
        data: {
          restaurants,
          filterOptions: backendData.filterOptions || {},
          pagination: {
            total: backendData.total || restaurants.length,
            limit: parseInt(searchParams.get('limit') || '24'),
            offset: parseInt(searchParams.get('offset') || '0'),
            hasMore: !!backendData.next_cursor || false
          }
        },
        message: 'Unified data retrieved successfully'
      };

      // Cache the response
      cache.set(cacheKey, {
        data: unifiedResponse,
        timestamp: Date.now()
      });

      return {
        payload: unifiedResponse,
        headers: {
          'Cache-Control': 'public, max-age=120',
          'CDN-Cache-Control': 'public, max-age=120',
          'Vercel-CDN-Cache-Control': 'public, max-age=120',
          'X-Cache': 'MISS'
        }
      };
    })();

    // Register the in-flight request
    inflight.set(cacheKey, p);

    try {
      const { payload, headers, status } = await p;
      return NextResponse.json(payload, { headers, status });
    } finally {
      // Clean up in-flight request
      inflight.delete(cacheKey);
    }

  } catch (_error) {
    // Error in unified restaurants endpoint
    
    // Return empty response on error
    return NextResponse.json({
      success: true,
      data: {
        restaurants: [],
        filterOptions: {
          agencies: ['ORB', 'Kosher Miami', 'Other'],
          kosherCategories: ['Dairy', 'Meat', 'Pareve'],
          listingTypes: ['Restaurant', 'Catering', 'Food Truck'],
          priceRanges: ['$', '$$', '$$$', '$$$$'],
          counts: { agencies: {}, kosherCategories: {}, listingTypes: {}, priceRanges: {}, total: 0 }
        },
        pagination: {
          total: 0,
          limit: parseInt(new URL(request.url).searchParams.get('limit') || '24'),
          offset: parseInt(new URL(request.url).searchParams.get('offset') || '0'),
          hasMore: false
        }
      },
      message: 'Fallback data provided'
    });
  }
}

// Fallback function to make separate calls if unified endpoint doesn't exist
async function fallbackToSeparateCalls(searchParams: URLSearchParams, _backendUrl: string) {
  try {
    // Make parallel calls to existing endpoints
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      : 'https://api.jewgo.app';
    
    const [restaurantsResponse, filterOptionsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/restaurants-with-images?${searchParams.toString()}`, {
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch(`${baseUrl}/api/restaurants/filter-options`, {
        headers: { 'Content-Type': 'application/json' }
      })
    ]);

    const [restaurantsData, filterOptionsData] = await Promise.all([
      restaurantsResponse.json(),
      filterOptionsResponse.json()
    ]);


    // Combine the responses
    const unifiedResponse = {
      success: true,
      data: {
        restaurants: restaurantsData.restaurants || restaurantsData.data?.restaurants || [],
        filterOptions: filterOptionsData.data || filterOptionsData,
        pagination: {
          total: restaurantsData.total || restaurantsData.data?.total || 0,
          limit: parseInt(searchParams.get('limit') || '24'),
          offset: parseInt(searchParams.get('offset') || '0'),
          hasMore: restaurantsData.hasMore || restaurantsData.data?.hasMore || false
        }
      },
      message: 'Data retrieved via fallback method'
    };

    return {
      payload: unifiedResponse,
      headers: {
        'Cache-Control': 'public, max-age=60', // Shorter cache for fallback
        'CDN-Cache-Control': 'public, max-age=60',
        'Vercel-CDN-Cache-Control': 'public, max-age=60',
        'X-Cache': 'FALLBACK'
      }
    };
  } catch (error) {
    // Error in fallback calls
    throw error;
  }
}
