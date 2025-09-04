import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for combined data (production should use Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes for combined data
const FILTER_CACHE_KEY = 'filter-options-only';
const SUPPRESS_WINDOW_MS = 400; // Short suppression window for near-back-to-back identical requests

// In-flight request coalescing map to merge identical concurrent requests
// Value resolves to the payload and headers to produce a fresh NextResponse per caller
const inflight = new Map<string, Promise<{ payload: any; headers: Record<string, string>; status?: number }>>();
// Recently served responses for sequential suppression
const recentlyServed = new Map<string, { payload: any; headers: Record<string, string>; status?: number; timestamp: number }>();

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
    
    // Short sequential suppression before full cache check
    const recent = recentlyServed.get(cacheKey);
    if (recent && Date.now() - recent.timestamp < SUPPRESS_WINDOW_MS) {
      return NextResponse.json(recent.payload, { headers: recent.headers, status: recent.status });
    }

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const payload = { success: true, ...cached.data, cached: true };
      const headers = {
        'Cache-Control': 'public, max-age=180', // 3 minutes browser cache
        'CDN-Cache-Control': 'public, max-age=180',
        'Vercel-CDN-Cache-Control': 'public, max-age=180'
      } as Record<string, string>;
      // Record as recently served to absorb micro-bursts
      recentlyServed.set(cacheKey, { payload, headers, status: undefined, timestamp: Date.now() });
      return NextResponse.json(payload, { headers });
    }

    // If an identical request is already being processed, reuse its result
    const existing = inflight.get(cacheKey);
    if (existing) {
      const { payload, headers, status } = await existing;
      return NextResponse.json(payload, { headers, status });
    }

    const baseUrl = process.env.NODE_ENV === 'development' 
      ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      : `https://${request.headers.get('host')}`;
    
    // Create in-flight promise and register before starting network calls
    const p = (async (): Promise<{ payload: any; headers: Record<string, string>; status?: number }> => {
      // Make requests to both endpoints in parallel for better performance
      const [restaurantsResponse, filterOptionsResponse] = await Promise.all([
        fetch(`${baseUrl}/api/restaurants-with-images?${searchParams.toString()}`, {
          headers: { 'Content-Type': 'application/json' }
        }),
        // Check if we have cached filter options to avoid redundant calls
        cache.has(FILTER_CACHE_KEY) && Date.now() - cache.get(FILTER_CACHE_KEY)!.timestamp < CACHE_TTL * 2
          ? Promise.resolve({ ok: true, json: () => Promise.resolve(cache.get(FILTER_CACHE_KEY)!.data) } as any)
          : fetch(`${baseUrl}/api/restaurants/filter-options`, {
              headers: { 'Content-Type': 'application/json' }
            })
      ]);

      // Handle restaurants response
      if (!restaurantsResponse.ok) {
        // Graceful handling: if downstream API returns 404 for a deeper page,
        // treat it as an empty page with no more results rather than erroring.
        if (restaurantsResponse.status === 404) {
          const fallbackFilterOptions = filterOptionsResponse.ok
            ? await filterOptionsResponse.json()
            : {
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
          const payload = {
            success: true,
            data: {
              restaurants: [],
              total: 0,
              filterOptions: fallbackFilterOptions.data || fallbackFilterOptions
            },
            pagination: {
              limit,
              offset,
              page,
              totalPages: page,
              hasMore: false
            }
          };
          const headers = {
            'Cache-Control': 'no-store'
          } as Record<string, string>;
          return { payload, headers };
        }
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
      const returnedCount = Array.isArray(restaurantsData?.data)
        ? restaurantsData.data.length
        : Array.isArray(restaurantsData)
        ? restaurantsData.length
        : 0;
      const totalFromBackend = Number(restaurantsData.total || restaurantsData.count || 0);
      
      // FIXED: Improved hasMore calculation to prevent infinite loops
      let hasMore: boolean;
      if (totalFromBackend > 0) {
        // Case 1: Backend provides total - use strict calculation
        hasMore = (offset + returnedCount) < totalFromBackend;
      } else if (returnedCount === 0) {
        // Case 2: No results returned - definitely no more
        hasMore = false;
      } else if (returnedCount < limit) {
        // Case 3: Partial page returned - no more data
        hasMore = false;
      } else if (page === 1 && returnedCount === limit) {
        // Case 4: First page is full - might have more (but be conservative)
        // Only assume more if we're on the first page and got exactly the limit
        hasMore = true;
      } else {
        // Case 5: Subsequent pages - be conservative, assume no more unless proven
        hasMore = false;
      }
      
      // Additional safety: if we've reached a reasonable page limit, stop
      if (page > 50) { // Arbitrary safety limit
        hasMore = false;
        console.warn('API safety limit reached: page', page);
      }
      
      const combinedData = {
        data: {
          restaurants: restaurantsData.data || [],
          total: totalFromBackend,
          filterOptions: filterOptionsData.data || filterOptionsData
        },
        pagination: {
          limit,
          offset,
          page,
          totalPages: totalFromBackend > 0 ? Math.ceil(totalFromBackend / limit) : (hasMore ? page + 1 : page),
          hasMore
        }
      };

      // Cache the combined response
      cache.set(cacheKey, {
        data: combinedData,
        timestamp: Date.now()
      });

      const headers = {
        'Cache-Control': 'public, max-age=180',
        'CDN-Cache-Control': 'public, max-age=180',
        'Vercel-CDN-Cache-Control': 'public, max-age=180'
      } as Record<string, string>;

      return {
        payload: { success: true, ...combinedData },
        headers
      };
    })();

    inflight.set(cacheKey, p);
    try {
      const { payload, headers, status } = await p;
      // Record as recently served
      recentlyServed.set(cacheKey, { payload, headers, status, timestamp: Date.now() });
      return NextResponse.json(payload, { headers, status });
    } finally {
      inflight.delete(cacheKey);
    }

  } catch (error) {
    console.error('Error in combined restaurants-with-filters API:', error);
    const urlObj = new URL(request.url);
    const limitVal = parseInt(urlObj.searchParams.get('limit') || '24');
    const offsetVal = parseInt(urlObj.searchParams.get('offset') || '0');
    const payload = {
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
        limit: limitVal,
        offset: offsetVal,
        page: 1,
        totalPages: 0
      }
    };
    const headers = { 'Cache-Control': 'no-store' } as Record<string, string>;
    // Briefly suppress repeated failures for the same key
    recentlyServed.set(`err:${request.url}`, { payload, headers, status: undefined, timestamp: Date.now() });
    // Return 200 so clients can show graceful empty state instead of HTTP error
    return NextResponse.json(payload, { headers });
  }
}
