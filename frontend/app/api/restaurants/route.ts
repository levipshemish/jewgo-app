import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';
import { rateLimitConfigs } from '@/lib/rate-limit/config';
import { fromSearchParams, FiltersSchema } from '@/lib/filters/schema';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'restaurants-submit');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    
    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    
    // Forward the request to the backend
    const backendResponse = await fetch(`${backendUrl}/api/restaurants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Check if response is JSON
    const contentType = backendResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          error: 'Backend service unavailable',
          message: 'Restaurant submission service is currently unavailable'
        },
        { status: 503 }
      );
    }

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error('Error in restaurants POST API route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to submit restaurant'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'restaurants-list');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    if (!request.nextUrl) {
      throw new Error('Request URL is undefined');
    }
    
    const { searchParams } = request.nextUrl;
    
    // Parse and validate filters using the shared schema
    let filters: any;
    try {
      filters = fromSearchParams(searchParams);
    } catch (error) {
      console.warn('Invalid filter parameters:', error);
      // Return empty results for invalid filters
      return NextResponse.json({
        success: true,
        data: {
          restaurants: [],
          total: 0,
          limit: 50,
          offset: 0
        }
      });
    }
    
    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    
    // Build query parameters for backend API
    const queryParams = new URLSearchParams();
    
    // Pagination
    if (filters.page) {
      const limit = filters.limit || 50;
      const offset = (filters.page - 1) * limit;
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
    } else if (filters.limit) {
      queryParams.append('limit', filters.limit.toString());
    }
    
    // Search query
    if (filters.q) {
      queryParams.append('search', filters.q);
    }
    
    // Kosher filters
    if (filters.agency) {
      queryParams.append('certifying_agency', filters.agency);
    }
    if (filters.dietary) {
      queryParams.append('kosher_category', filters.dietary);
    }
    if (filters.category) {
      queryParams.append('listing_type', filters.category);
    }
    
    // Location-based filtering (CRITICAL: Server-side distance filtering)
    if (filters.nearMe && filters.lat && filters.lng && filters.maxDistanceMi) {
      queryParams.append('lat', filters.lat.toString());
      queryParams.append('lng', filters.lng.toString());
      queryParams.append('max_distance_mi', filters.maxDistanceMi.toString());
    }
    
    // Time-based filtering
    if (filters.openNow) {
      queryParams.append('open_now', '1');
    }
    
    // Rating and price filters
    if (filters.ratingMin) {
      queryParams.append('min_rating', filters.ratingMin.toString());
    }
    if (filters.priceMin) {
      queryParams.append('price_min', filters.priceMin.toString());
    }
    if (filters.priceMax) {
      queryParams.append('price_max', filters.priceMax.toString());
    }
    
    // Forward the request to the backend
    const backendResponse = await fetch(
      `${backendUrl}/api/restaurants?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Check if response is JSON
    const contentType = backendResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          error: 'Backend service unavailable',
          message: 'Restaurant service is currently unavailable'
        },
        { status: 503 }
      );
    }

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error('Error in restaurants GET API route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch restaurants'
      },
      { status: 500 }
    );
  }
} 