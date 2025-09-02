import { NextRequest, NextResponse} from 'next/server';

// In-memory cache for filter options (production should use Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'filter-options';

export async function GET(_request: NextRequest) {
  try {
    // Check cache first
    const cached = cache.get(CACHE_KEY);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes browser cache
          'CDN-Cache-Control': 'public, max-age=300',
          'Vercel-CDN-Cache-Control': 'public, max-age=300'
        }
      });
    }

    // Use production backend URL if environment variable is not set
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    
    // Fetch filter options from backend API
    const _backendResponse = await fetch(`${backendUrl}/api/restaurants/filter-options`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!_backendResponse.ok) {
      // Return default options if backend is unavailable
      return NextResponse.json({
        success: true,
        data: {
          agencies: [
            'ORB',
            'Kosher Miami',
            'Other'
          ],
          kosherCategories: [
            'Dairy',
            'Meat',
            'Pareve'
          ],
          listingTypes: [
            'Restaurant',
            'Catering',
            'Food Truck'
          ],
          priceRanges: [
            '$',
            '$$',
            '$$$',
            '$$$$'
          ],
          counts: {
            agencies: {},
            kosherCategories: {},
            listingTypes: {},
            priceRanges: {},
            total: 0
          }
        }
      });
    }
    
    const _data = await _backendResponse.json();
    
    // Cache the successful response
    const responseData = _data.data || _data;
    cache.set(CACHE_KEY, {
      data: responseData,
      timestamp: Date.now()
    });
    
    return NextResponse.json({
      success: true,
      data: responseData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes browser cache
        'CDN-Cache-Control': 'public, max-age=300',
        'Vercel-CDN-Cache-Control': 'public, max-age=300'
      }
    });
    
  } catch (_error) {
    console.error('Error fetching filter options:', _error);
    
    // Return default options on error
    return NextResponse.json({
      success: true,
      data: {
        agencies: [
          'ORB',
          'Kosher Miami',
          'Other'
        ],
        kosherCategories: [
          'Dairy',
          'Meat',
          'Pareve'
        ],
        listingTypes: [
          'Restaurant',
          'Catering',
          'Food Truck'
        ],
        priceRanges: [
          '$',
          '$$',
          '$$$',
          '$$$$'
        ],
        counts: {
          agencies: {},
          kosherCategories: {},
          listingTypes: {},
          priceRanges: {},
          total: 0
        }
      }
    });
  }
} 