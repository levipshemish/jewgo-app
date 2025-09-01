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
    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://api.jewgo.app';
    
    // Forward the request to the backend
    const backendResponse = await fetch(
      `${backendUrl}/api/statistics`,
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
      // Return default statistics for non-JSON responses
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
        message: 'Statistics service temporarily unavailable'
      });
    }

    // For server errors, return default statistics
    if (!backendResponse.ok && backendResponse.status >= 500) {
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
        message: 'Statistics service temporarily unavailable'
      });
    }

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    // For any network errors, return default statistics to ensure UI works
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
      message: error instanceof Error && (
        error.name === 'AbortError' || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('network')
      ) ? 'Statistics service temporarily unavailable' : 'Statistics not available'
    });
  }
} 