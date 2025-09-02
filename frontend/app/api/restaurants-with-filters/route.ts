import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for combined data (production should use Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes for combined data
const FILTER_CACHE_KEY = 'filter-options-only';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract pagination and filter parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const page = Math.floor(offset / limit) + 1;
    
    // Build cache key for this specific query
    const queryParams = Array.from(searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const cacheKey = `restaurants-with-filters:${queryParams}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        ...cached.data,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=180', // 3 minutes browser cache
          'CDN-Cache-Control': 'public, max-age=180',
          'Vercel-CDN-Cache-Control': 'public, max-age=180'
        }
      });
    }

    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : `https://${request.headers.get('host')}`;
    
    // Make requests to both endpoints in parallel for better performance
    const [restaurantsResponse, filterOptionsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/restaurants-with-images?${searchParams.toString()}`, {
        headers: { 'Content-Type': 'application/json' }
      }),
      // Check if we have cached filter options to avoid redundant calls
      cache.has(FILTER_CACHE_KEY) && Date.now() - cache.get(FILTER_CACHE_KEY)!.timestamp < CACHE_TTL * 2
        ? Promise.resolve({ ok: true, json: () => Promise.resolve(cache.get(FILTER_CACHE_KEY)!.data) })
        : fetch(`${baseUrl}/api/restaurants/filter-options`, {
            headers: { 'Content-Type': 'application/json' }
          })
    ]);

    // Handle restaurants response
    if (!restaurantsResponse.ok) {
      throw new Error(`Restaurants API error: ${restaurantsResponse.status}`);
    }
    
    const restaurantsData = await restaurantsResponse.json();
    
    // Handle filter options response  
    let filterOptionsData;
    if (!filterOptionsResponse.ok) {
      // Fallback filter options if backend is unavailable
      filterOptionsData = {
        success: true,
        data: {
          agencies: ['ORB', 'Kosher Miami', 'Other'],
          kosherCategories: ['Dairy', 'Meat', 'Pareve'],
          listingTypes: ['Restaurant', 'Catering', 'Food Truck'],
          priceRanges: ['$', '$$', '$$$', '$$$$'],
          cities: [],
          states: []
        }
      };
    } else {
      filterOptionsData = await filterOptionsResponse.json();
      
      // Cache filter options separately for reuse
      if (filterOptionsData.success) {
        cache.set(FILTER_CACHE_KEY, {
          data: filterOptionsData,
          timestamp: Date.now()
        });
      }
    }

    // Combine the responses
    const combinedData = {
      data: {
        restaurants: restaurantsData.data || [],
        total: restaurantsData.total || 0,
        filterOptions: filterOptionsData.data || filterOptionsData
      },
      pagination: {
        limit,
        offset,
        page,
        totalPages: Math.ceil((restaurantsData.total || 0) / limit)
      }
    };

    // Cache the combined response
    cache.set(cacheKey, {
      data: combinedData,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      ...combinedData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=180', // 3 minutes browser cache
        'CDN-Cache-Control': 'public, max-age=180',
        'Vercel-CDN-Cache-Control': 'public, max-age=180'
      }
    });

  } catch (error) {
    console.error('Error in combined restaurants-with-filters API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data',
      data: {
        restaurants: [],
        total: 0,
        filterOptions: {
          agencies: ['ORB'],
          kosherCategories: ['Dairy', 'Meat', 'Pareve'], 
          listingTypes: ['Restaurant'],
          priceRanges: ['$', '$$', '$$$'],
          cities: [],
          states: []
        }
      },
      pagination: {
        limit: parseInt(new URL(request.url).searchParams.get('limit') || '24'),
        offset: parseInt(new URL(request.url).searchParams.get('offset') || '0'),
        page: 1,
        totalPages: 0
      }
    }, { status: 500 });
  }
}