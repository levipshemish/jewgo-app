import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, errorResponses, createSuccessResponse } from '@/lib';

/**
 * API Route: POST /api/restaurants/fetch-missing-hours
 * 
 * Fetches operating hours for all restaurants that don't have them.
 * This is a bulk operation that can take some time.
 * 
 * @param request - The incoming request with optional limit parameter
 * @returns JSON response with bulk update information
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body to get the limit
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 10;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return errorResponses.badRequest();
    }

    // Get backend URL from environment
    const backendUrl = getBackendUrl();
    
    // Forward the request to the backend
    const backendResponse = await fetch(
      `${backendUrl}/api/v4/restaurants/fetch-missing-hours`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit }),
      }
    );

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch {
    // // console.error('Error in fetch-missing-hours API route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch missing hours'
      },
      { status: 500 }
    );
  }
} 
