import { NextRequest, NextResponse } from 'next/server';

import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Filter parameters
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const certifying_agency = searchParams.get('certifying_agency');
    const kosher_category = searchParams.get('kosher_category');
    const is_cholov_yisroel = searchParams.get('is_cholov_yisroel');
    const listing_type = searchParams.get('listing_type');
    const price_range = searchParams.get('price_range');
    const min_rating = searchParams.get('min_rating');
    const has_reviews = searchParams.get('has_reviews');
    const open_now = searchParams.get('open_now');
    const status = searchParams.get('status');
    
    // Location-based filtering
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    
    // Build query parameters for backend API
    const queryParams = new URLSearchParams();
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    if (offset) {
      queryParams.append('offset', offset.toString());
    }
    if (search) {
      queryParams.append('query', search);
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
    // Map kosher_category to kosher_type for backend API compatibility
    if (kosher_category) {
      queryParams.append('kosher_type', kosher_category);
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
    
    // Call the backend API with our local database
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/restaurants?${queryParams.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
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
      total: restaurantsWithImages.length,
      limit,
      offset,
      message: 'Restaurants with images only'
    });

  } catch (error) {
    console.error('Error fetching restaurants with images:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch restaurants with images',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 