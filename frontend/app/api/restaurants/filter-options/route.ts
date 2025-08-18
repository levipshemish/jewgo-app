import { NextResponse } from 'next/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch actual data from the backend API to get real filter options
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    
    // Get restaurants to extract unique values
    const restaurantsResponse = await fetch(`${backendUrl}/api/restaurants?limit=1000`);
    
    // Check if response is JSON
    const contentType = restaurantsResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Backend service unavailable');
    }
    
    const restaurantsData = await restaurantsResponse.json();
    const restaurants = restaurantsData.restaurants || restaurantsData.data || [];
    
    // Extract unique values from actual data - only include valid kosher categories
    const cities = Array.from(new Set(restaurants.map((r: { city?: string }) => r.city).filter(Boolean))).sort();
    const states = Array.from(new Set(restaurants.map((r: { state?: string }) => r.state).filter(Boolean))).sort();
    const agencies = Array.from(new Set(restaurants.map((r: { certifying_agency?: string }) => r.certifying_agency).filter(Boolean))).sort();
    const listingTypes = Array.from(new Set(restaurants.map((r: { listing_type?: string; category?: string }) => r.listing_type || r.category).filter(Boolean))).sort();
    
    // Only include valid kosher categories (dairy, meat, pareve)
    const validKosherCategories = ['dairy', 'meat', 'pareve'];
    const kosherCategories = Array.from(new Set(restaurants.map((r: { kosher_category?: string; kosher_type?: string }) => r.kosher_category || r.kosher_type).filter(Boolean))).sort();
    const correctedKosherCategories = kosherCategories
      .filter((category): category is string => typeof category === 'string' && validKosherCategories.includes(category.toLowerCase()))
      .map(category => category.toLowerCase())
      .filter((category, index, arr) => arr.indexOf(category) === index) // Remove duplicates
      .sort();
    
    const priceRanges = Array.from(new Set(restaurants.map((r: { price_range?: string }) => r.price_range).filter(Boolean))).sort();
    
    const filterOptions = {
      cities,
      states,
      agencies,
      listingTypes,
      priceRanges,
      kosherCategories: correctedKosherCategories
    };

    return NextResponse.json({
      success: true,
      data: filterOptions
    });

  } catch {
    // // console.error('Error fetching filter options:', error);
    
    // Fallback to actual database data if API fails
    const fallbackOptions = {
      cities: ['Miami', 'Miami Beach', 'Boca Raton', 'Fort Lauderdale'],
      states: ['FL'],
      agencies: ['Kosher Miami', 'ORB'],
      listingTypes: ['restaurant', 'bakery', 'catering'],
      priceRanges: ['$', '$$', '$$$', '$$$$'],
      kosherCategories: ['meat', 'dairy', 'pareve']
    };
    
    return NextResponse.json({
      success: true,
      data: fallbackOptions
    });
  }
} 