import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, getBackendUrl } from '@/lib';

import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';

// Sample restaurant data for fallback when backend is unavailable
function getSampleRestaurantsWithImages() {
  return [
    {
      id: 1,
      name: "Kosher Deli & Grill",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Glatt Kosher",
      city: "Miami",
      state: "FL",
      zip_code: "33101",
      rating: 4.5,
      price_range: "$$",
      status: "active",
      latitude: 25.7617,
      longitude: -80.1918
    },
    {
      id: 2,
      name: "Jerusalem Pizza",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Kosher",
      city: "Miami Beach",
      state: "FL",
      zip_code: "33139",
      rating: 4.2,
      price_range: "$",
      status: "active",
      latitude: 25.7907,
      longitude: -80.1300
    },
    {
      id: 3,
      name: "Shalom Sushi",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Glatt Kosher",
      city: "Aventura",
      state: "FL",
      zip_code: "33180",
      rating: 4.7,
      price_range: "$$$",
      status: "active",
      latitude: 25.9565,
      longitude: -80.1390
    },
    {
      id: 4,
      name: "Beth Israel Bakery",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Kosher",
      city: "Hollywood",
      state: "FL",
      zip_code: "33020",
      rating: 4.3,
      price_range: "$",
      status: "active",
      latitude: 26.0112,
      longitude: -80.1495
    },
    {
      id: 5,
      name: "Miami Kosher Market",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Glatt Kosher",
      city: "North Miami",
      state: "FL",
      zip_code: "33161",
      rating: 4.1,
      price_range: "$$",
      status: "active",
      latitude: 25.8901,
      longitude: -80.1867
    },
    {
      id: 6,
      name: "Kosher Express",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Kosher",
      city: "Coral Gables",
      state: "FL",
      zip_code: "33134",
      rating: 4.4,
      price_range: "$",
      status: "active",
      latitude: 25.7214,
      longitude: -80.2683
    },
    {
      id: 7,
      name: "Glatt Kosher Deli",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Glatt Kosher",
      city: "Sunny Isles",
      state: "FL",
      zip_code: "33154",
      rating: 4.6,
      price_range: "$$",
      status: "active",
      latitude: 25.9420,
      longitude: -80.1234
    },
    {
      id: 8,
      name: "Kosher Corner",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Kosher",
      city: "Doral",
      state: "FL",
      zip_code: "33178",
      rating: 4.0,
      price_range: "$",
      status: "active",
      latitude: 25.8195,
      longitude: -80.3553
    }
  ];
}

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Declare these variables outside try block so they're accessible in catch
  const backendUrl = '';
  let apiUrl = '';
  
  try {
    const { searchParams } = request.nextUrl;
    
    // Validate and sanitize search parameters to prevent malformed URLs
    const sanitizeParam = (value: string | null): string | null => {
      if (!value) {return null;}
      // Remove any potentially dangerous characters
      return value.replace(/[<>\"'&]/g, '').trim();
    };
    
    // Pagination
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const rawPage = parseInt(searchParams.get('page') || '1');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Validate and clamp pagination parameters
    const limit = Math.min(Math.max(rawLimit, 1), 100); // Clamp between 1 and 100
    const page = Math.max(rawPage, 1); // Clamp to minimum 1
    
    // Convert page to offset if page is provided
    const calculatedOffset = page > 1 ? (page - 1) * limit : offset;
    
    // Filter parameters with sanitization
    const search = sanitizeParam(searchParams.get('search') || searchParams.get('q'));
    const city = sanitizeParam(searchParams.get('city'));
    const state = sanitizeParam(searchParams.get('state'));
    const certifying_agency = sanitizeParam(searchParams.get('certifying_agency') || searchParams.get('agency'));
    const kosher_category = sanitizeParam(searchParams.get('kosher_category') || searchParams.get('dietary'));
    const listing_type = sanitizeParam(searchParams.get('listing_type') || searchParams.get('category'));
    const is_cholov_yisroel = sanitizeParam(searchParams.get('is_cholov_yisroel'));
    const _price_range = sanitizeParam(searchParams.get('price_range'));
    const min_rating = sanitizeParam(searchParams.get('min_rating') || searchParams.get('ratingMin'));
    const has_reviews = sanitizeParam(searchParams.get('has_reviews'));
    const open_now = sanitizeParam(searchParams.get('open_now') || searchParams.get('openNow'));
    const status = sanitizeParam(searchParams.get('status'));
    
    // Location-based filtering with validation
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || searchParams.get('maxDistanceMi');
    
    // Validate lat/lng if provided
    if (lat && (isNaN(parseFloat(lat)) || parseFloat(lat) < -90 || parseFloat(lat) > 90)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid latitude value',
        error: 'Latitude must be between -90 and 90'
      }, { status: 400 });
    }
    
    if (lng && (isNaN(parseFloat(lng)) || parseFloat(lng) < -180 || parseFloat(lng) > 180)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid longitude value',
        error: 'Longitude must be between -180 and 180'
      }, { status: 400 });
    }
    
    // Build query parameters for backend API
    const queryParams = new URLSearchParams();
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    if (calculatedOffset > 0) {
      queryParams.append('offset', calculatedOffset.toString());
    }
    if (search) {
      queryParams.append('search', search);
    }
    if (city) {
      queryParams.append('city', city);
    }
    if (state) {
      queryParams.append('state', state);
    }
    if (certifying_agency) {
      queryParams.append('certifying_agency', certifying_agency);
    }
    // Map kosher_category to kosher_category for backend API compatibility
    if (kosher_category) {
      queryParams.append('kosher_category', kosher_category);
    }
    if (is_cholov_yisroel) {
      queryParams.append('is_cholov_yisroel', is_cholov_yisroel);
    }
    if (listing_type) {
      queryParams.append('listing_type', listing_type);
    }
    
    // Handle price range filters (convert from price_min/price_max to backend format)
    const price_min = searchParams.get('price_min');
    const price_max = searchParams.get('price_max');
    if (price_min) {
      queryParams.append('price_min', price_min);
    }
    if (price_max) {
      queryParams.append('price_max', price_max);
    }
    
    if (min_rating) {
      queryParams.append('min_rating', min_rating);
    }
    if (has_reviews) {
      queryParams.append('has_reviews', has_reviews);
    }
    if (open_now) {
      queryParams.append('open_now', open_now);
    }
    if (status) {
      queryParams.append('status', status);
    }
    if (lat) {
      queryParams.append('lat', lat);
    }
    if (lng) {
      queryParams.append('lng', lng);
    }
    if (radius) {
      queryParams.append('max_distance_mi', radius);
    }
    
    // Handle dietary filters (multiple values)
    const dietaries = searchParams.getAll('dietary');
    dietaries.forEach(dietary => {
      queryParams.append('dietary', dietary);
    });
    
    // Call the backend API (normalize URL and default to production API)
    const raw = process.env["NEXT_PUBLIC_BACKEND_URL"];
    let finalBackendUrl = raw && raw.trim().length > 0
      ? raw.replace(/\/+$/, '')
      : getBackendUrl();
    
    // Ensure the backend URL has a protocol
    if (finalBackendUrl && !finalBackendUrl.startsWith('http://') && !finalBackendUrl.startsWith('https://')) {
      finalBackendUrl = `https://${finalBackendUrl}`;
    }
    
    // Use v4 backend route prefix
    apiUrl = `${finalBackendUrl}/api/restaurants?${queryParams.toString()}`;
    
    // Configurable timeout to avoid long hangs in dev; faster fallback improves UX
    const timeoutEnv = process.env.NEXT_PUBLIC_BACKEND_TIMEOUT_MS;
    const timeoutMs = Number.isFinite(Number(timeoutEnv)) && Number(timeoutEnv) > 0
      ? Number(timeoutEnv)
      : (process.env.NODE_ENV === 'production' ? 8000 : 5000);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    
    if (!response.ok) {
      if (response.status >= 500) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(`Backend API unavailable (${response.status}), returning sample data (non-prod)`);
          return createSuccessResponse(getSampleRestaurantsWithImages(), 'Using sample data - backend unavailable');
        }
        // In production, return a graceful empty response
        return NextResponse.json({
          success: false,
          data: [],
          total: 0,
          page,
          limit,
          offset: calculatedOffset,
          message: 'Restaurants service temporarily unavailable'
        }, { status: 503 });
      }
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Debug logging to see what rating data we're getting from backend
    if (process.env.NODE_ENV === 'development') {
      console.log('Backend response data:', {
        hasRestaurants: !!data.restaurants,
        restaurantCount: data.restaurants?.length || 0,
        message: data.message,
        isSampleData: data.message?.includes('sample data'),
        firstRestaurant: data.restaurants?.[0] || null,
        ratingFields: data.restaurants?.[0] ? {
          rating: data.restaurants[0].rating,
          google_rating: data.restaurants[0].google_rating,
          star_rating: data.restaurants[0].star_rating,
          quality_rating: data.restaurants[0].quality_rating
        } : null
      });
    }
    
    // First sanitize all restaurant data, then filter out restaurants without images
    const allRestaurants = data.restaurants || data.data || data || [];
    const sanitizedRestaurants = sanitizeRestaurantData(allRestaurants);
    
    // Debug logging to see what happens after sanitization
    if (process.env.NODE_ENV === 'development' && sanitizedRestaurants.length > 0) {
      console.log('After sanitization:', {
        firstRestaurant: sanitizedRestaurants[0],
        ratingFields: {
          rating: sanitizedRestaurants[0].rating,
          google_rating: sanitizedRestaurants[0].google_rating,
          star_rating: sanitizedRestaurants[0].star_rating,
          quality_rating: sanitizedRestaurants[0].quality_rating
        }
      });
    }
    

    
    // Check if this is sample data (either from message or by checking if all restaurants have default images)
    const isSampleData = data.message && data.message.includes('sample data') || 
                        (sanitizedRestaurants.length > 0 && 
                         sanitizedRestaurants.every((r: any) => r.image_url === '/images/default-restaurant.webp'));
    
        // Filter restaurants to only include those with valid images
    const restaurantsWithImages = isSampleData 
      ? sanitizedRestaurants // Include all restaurants for sample data
      : sanitizedRestaurants.filter((restaurant: { image_url?: string | null }) =>
          restaurant.image_url && 
          restaurant.image_url !== null && 
          restaurant.image_url !== '' && 
          restaurant.image_url !== '/images/default-restaurant.webp'  // Exclude default placeholders
        );
    


    // Respect pagination even if backend ignores limit/offset
    const totalAvailable = data.totalRestaurants || data.total || data.count || restaurantsWithImages.length;
    const totalPages = data.totalPages || Math.ceil(totalAvailable / limit);
    const needsClientSidePaging = restaurantsWithImages.length > limit;
    const pagedRestaurants = needsClientSidePaging
      ? restaurantsWithImages.slice(calculatedOffset, calculatedOffset + limit)
      : restaurantsWithImages;
    
    // Calculate pagination metadata
    const totalCount = totalAvailable;
    const hasMore = offset + limit < totalCount;
    
    // Debug logging to see final response
    if (process.env.NODE_ENV === 'development' && pagedRestaurants.length > 0) {
      console.log('Final API response sample:', {
        firstRestaurant: pagedRestaurants[0],
        ratingFields: {
          rating: pagedRestaurants[0].rating,
          google_rating: pagedRestaurants[0].google_rating,
          star_rating: pagedRestaurants[0].star_rating,
          quality_rating: pagedRestaurants[0].quality_rating
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      restaurants: pagedRestaurants,
      pagination: {
        total: totalCount,
        limit,
        offset: calculatedOffset,
        hasMore,
        currentPage: Math.floor(calculatedOffset / limit) + 1,
        totalPages,
      },
      message: 'Restaurants with images retrieved successfully',
    });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching restaurants with images:', error);
    // eslint-disable-next-line no-console
    console.error('Backend URL used:', backendUrl);
    // eslint-disable-next-line no-console
    console.error('Full API URL:', apiUrl);
    
    // Handle network errors: sample only in non-prod, otherwise graceful empty
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const isNetworkError = error.name === 'AbortError' || 
                            errorMessage.includes('timeout') ||
                            errorMessage.includes('network') ||
                            errorMessage.includes('fetch') ||
                            errorMessage.includes('connect') ||
                            errorMessage.includes('enotfound') ||
                            errorMessage.includes('econnrefused');
      
      if (isNetworkError) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(`Backend request failed (${error.name || 'Network error'}), returning sample data (non-prod)`);
          return NextResponse.json({
            success: true,
            data: getSampleRestaurantsWithImages(),
            total: 8,
            totalPages: 1,
            page: 1,
            limit: 50,
            offset: 0,
            message: `Using sample data - backend ${error.name === 'AbortError' ? 'timeout' : 'unavailable'} (non-prod)`
          });
        }
        return NextResponse.json({
          success: false,
          data: [],
          total: 0,
          totalPages: 0,
          page: 1,
          limit: 50,
          offset: 0,
          message: 'Restaurants service temporarily unavailable'
        }, { status: 503 });
      }
    }
    
    // Unexpected error: sample in non-prod, graceful empty in prod
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Unexpected error fetching restaurants, returning sample data as fallback (non-prod)');
      return createSuccessResponse(getSampleRestaurantsWithImages(), 'Using sample data as fallback');
    }
    return NextResponse.json({
      success: false,
      data: [],
      total: 0,
      totalPages: 0,
      page: 1,
      limit: 50,
      offset: 0,
      message: 'Restaurants service temporarily unavailable'
    }, { status: 503 });
  }
}
