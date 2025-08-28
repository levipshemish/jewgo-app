/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

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
      rating: 4.5,
      price_range: "$$",
      status: "active"
    },
    {
      id: 2,
      name: "Jerusalem Pizza",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Kosher",
      city: "Miami Beach",
      state: "FL",
      rating: 4.2,
      price_range: "$",
      status: "active"
    },
    {
      id: 3,
      name: "Shalom Sushi",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Glatt Kosher",
      city: "Aventura",
      state: "FL",
      rating: 4.7,
      price_range: "$$$",
      status: "active"
    },
    {
      id: 4,
      name: "Beth Israel Bakery",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Kosher",
      city: "Hollywood",
      state: "FL",
      rating: 4.3,
      price_range: "$",
      status: "active"
    },
    {
      id: 5,
      name: "Miami Kosher Market",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Glatt Kosher",
      city: "North Miami",
      state: "FL",
      rating: 4.1,
      price_range: "$$",
      status: "active"
    },
    {
      id: 6,
      name: "Kosher Express",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Kosher",
      city: "Coral Gables",
      state: "FL",
      rating: 4.4,
      price_range: "$",
      status: "active"
    },
    {
      id: 7,
      name: "Glatt Kosher Deli",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Glatt Kosher",
      city: "Sunny Isles",
      state: "FL",
      rating: 4.6,
      price_range: "$$",
      status: "active"
    },
    {
      id: 8,
      name: "Kosher Corner",
      image_url: "/images/default-restaurant.webp",
      kosher_category: "Kosher",
      city: "Doral",
      state: "FL",
      rating: 4.0,
      price_range: "$",
      status: "active"
    }
  ];
}

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    
    // Validate and sanitize search parameters to prevent malformed URLs
    const sanitizeParam = (value: string | null): string | null => {
      if (!value) return null;
      // Remove any potentially dangerous characters
      return value.replace(/[<>\"'&]/g, '').trim();
    };
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = parseInt(searchParams.get('offset') || '0');
    
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
    const price_range = sanitizeParam(searchParams.get('price_range'));
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
    if (price_range) {
      queryParams.append('price_range', price_range);
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
      queryParams.append('radius', radius);
    }
    
    // Call the backend API (normalize URL and default to local in dev)
    const raw = process.env["NEXT_PUBLIC_BACKEND_URL"];
    const backendUrl = raw && raw.trim().length > 0
      ? raw.replace(/\/+$/, '')
      : (process.env.NODE_ENV === 'production' ? 'https://jewgo-app-oyoh.onrender.com' : 'http://127.0.0.1:8082');
    const apiUrl = `${backendUrl}/api/restaurants?${queryParams.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      // If backend is down, return sample data instead of throwing error
      if (response.status === 500 || response.status === 503) {
        console.warn(`Backend API unavailable (${response.status}), returning sample data`);
        return NextResponse.json({
          success: true,
          data: getSampleRestaurantsWithImages(),
          total: 8,
          limit,
          offset: calculatedOffset,
          message: 'Using sample data - backend unavailable'
        });
      }
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // First sanitize all restaurant data, then filter out restaurants without images
    const allRestaurants = data.restaurants || data.data || data || [];
    const sanitizedRestaurants = sanitizeRestaurantData(allRestaurants);
    
    const restaurantsWithImages = sanitizedRestaurants.filter((restaurant: { image_url?: string | null }) => 
      restaurant.image_url && 
      restaurant.image_url !== null && 
      restaurant.image_url !== '' && 
      restaurant.image_url !== '/images/default-restaurant.webp'  // Exclude default placeholders
    );
    
    return NextResponse.json({
      success: true,
      data: restaurantsWithImages,
      total: data.total || data.count || restaurantsWithImages.length, // Use backend total, not filtered length
      limit,
      offset: calculatedOffset,
      message: 'Restaurants with images only'
    });

  } catch (error) {
    console.error('Error fetching restaurants with images:', error);
    
    // Handle timeout and network errors gracefully
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        console.warn('Backend request timed out, returning sample data');
        return NextResponse.json({
          success: true,
          data: getSampleRestaurantsWithImages(),
          total: 8,
          limit: 50,
          offset: 0,
          message: 'Using sample data - backend timeout'
        });
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch restaurants with images',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
/* eslint-disable no-console */
