import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: POST /api/update-database
 * 
 * Update database schema and data.
 * 
 * @param request - The incoming request
 * @returns JSON response with database update results
 */
export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.jewgo.app'; 
    
    // Forward the request to the backend
    const backendResponse = await fetch(
      `${backendUrl}/api/update-database`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch {
    // // console.error('Error in update-database API route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to update database'
      },
      { status: 500 }
    );
  }
} 
