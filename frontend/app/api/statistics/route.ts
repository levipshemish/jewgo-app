import { NextResponse } from 'next/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

/**
 * API Route: GET /api/statistics
 * 
 * Get application statistics and metrics.
 * 
 * @param request - The incoming request
 * @returns JSON response with statistics data
 */
export async function GET() {
  try {
    // Since there's no backend statistics endpoint, return default statistics
    // This ensures the UI continues to work without errors
    return NextResponse.json({
      totalRestaurants: 0,
      totalReviews: 0,
      totalUsers: 0,
      averageRating: 0,
      restaurantsByCategory: {
        meat: 0,
        dairy: 0,
        pareve: 0
      },
      message: 'Statistics not available - backend endpoint not implemented'
    });

  } catch (error) {
    // For any errors, return default statistics to ensure UI works
    return NextResponse.json({
      totalRestaurants: 0,
      totalReviews: 0,
      totalUsers: 0,
      averageRating: 0,
      restaurantsByCategory: {
        meat: 0,
        dairy: 0,
        pareve: 0
      },
      message: 'Statistics not available'
    });
  }
} 