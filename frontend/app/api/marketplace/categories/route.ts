import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API Route: GET /api/marketplace/categories
 * 
 * Get marketplace categories and subcategories.
 * 
 * @param request - The incoming request
 * @returns JSON response with marketplace categories data
 */
export async function GET() {
  try {
    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo-app-oyoh.onrender.com';
    
    // Forward the request to the backend
    const backendResponse = await fetch(
      `${backendUrl}/api/v4/marketplace/categories`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      }
    );

    // Check if response is JSON
    const contentType = backendResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Backend service unavailable',
          message: 'Marketplace categories service is currently unavailable'
        },
        { status: 503 }
      );
    }

    const data = await backendResponse.json();

    // Transform the response structure to match frontend expectations
    // Backend returns: {data: {categories: [...]}} 
    // Frontend expects: {data: [...]}
    if (data.success && data.data && data.data.categories) {
      // Transform old structure to new structure
      const transformedData = {
        ...data,
        data: data.data.categories
      };
      return NextResponse.json(transformedData, { status: backendResponse.status });
    } else if (data.success && data.data && Array.isArray(data.data)) {
      // Already in correct structure
      return NextResponse.json(data, { status: backendResponse.status });
    } else {
      // Fallback: return data as-is
      return NextResponse.json(data, { status: backendResponse.status });
    }

  } catch (error) {
    console.error('Error in marketplace categories API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch marketplace categories'
      },
      { status: 500 }
    );
  }
}
