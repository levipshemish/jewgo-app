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
    
    // Extract unique values from actual data with counts
    const cityCounts = restaurants.reduce((acc: Record<string, number>, r: { city?: string }) => {
      if (r.city) {
        acc[r.city] = (acc[r.city] || 0) + 1;
      }
      return acc;
    }, {});
    const cities = Object.keys(cityCounts).sort();
    
    const stateCounts = restaurants.reduce((acc: Record<string, number>, r: { state?: string }) => {
      if (r.state) {
        acc[r.state] = (acc[r.state] || 0) + 1;
      }
      return acc;
    }, {});
    const states = Object.keys(stateCounts).sort();
    
    const agencyCounts = restaurants.reduce((acc: Record<string, number>, r: { certifying_agency?: string }) => {
      if (r.certifying_agency) {
        acc[r.certifying_agency] = (acc[r.certifying_agency] || 0) + 1;
      }
      return acc;
    }, {});
    const agencies = Object.keys(agencyCounts).sort();
    
    const listingTypeCounts = restaurants.reduce((acc: Record<string, number>, r: { listing_type?: string; category?: string }) => {
      const type = r.listing_type || r.category;
      if (type) {
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {});
    const listingTypes = Object.keys(listingTypeCounts).sort();
    
    // Only include valid kosher categories (dairy, meat, pareve) with counts
    const validKosherCategories = ['dairy', 'meat', 'pareve'];
    const kosherCategoryCounts = restaurants.reduce((acc: Record<string, number>, r: { kosher_category?: string; kosher_type?: string }) => {
      const category = r.kosher_category || r.kosher_type;
      if (category && validKosherCategories.includes(category.toLowerCase())) {
        const normalizedCategory = category.toLowerCase();
        acc[normalizedCategory] = (acc[normalizedCategory] || 0) + 1;
      }
      return acc;
    }, {});
    const kosherCategories = Object.keys(kosherCategoryCounts).sort();
    
    const priceRangeCounts = restaurants.reduce((acc: Record<string, number>, r: { price_range?: string }) => {
      if (r.price_range) {
        acc[r.price_range] = (acc[r.price_range] || 0) + 1;
      }
      return acc;
    }, {});
    const priceRanges = Object.keys(priceRangeCounts).sort();
    
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