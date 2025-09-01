import { NextResponse } from 'next/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

/**
 * API Route: GET /api/kosher-types
 * 
 * Get available kosher types and categories.
 * 
 * @param request - The incoming request
 * @returns JSON response with kosher types data
 */
export async function GET() {
  try {
    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo-app-oyoh.onrender.com';
    
    // Forward the request to the backend
    const backendResponse = await fetch(
      `${backendUrl}/api/kosher-types`,
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
      return NextResponse.json(
        { 
          error: 'Backend service unavailable',
          message: 'Kosher types service is currently unavailable'
        },
        { status: 503 }
      );
    }

    // For server errors, return default kosher types
    if (!backendResponse.ok && backendResponse.status >= 500) {
      return NextResponse.json({
        success: true,
        data: {
          categories: ['Meat', 'Dairy', 'Pareve'],
          certifiers: ['OU', 'OK', 'Star-K', 'CRC', 'Other'],
          types: {
            meat: ['Glatt', 'Beit Yosef', 'Regular'],
            dairy: ['Cholov Yisroel', 'Cholov Stam'],
            general: ['Pas Yisroel', 'Yoshon', 'Kemach Yoshon']
          }
        },
        message: 'Using default kosher types'
      });
    }

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    // Return default kosher types for any error
    return NextResponse.json({
      success: true,
      data: {
        categories: ['Meat', 'Dairy', 'Pareve'],
        certifiers: ['OU', 'OK', 'Star-K', 'CRC', 'Other'],
        types: {
          meat: ['Glatt', 'Beit Yosef', 'Regular'],
          dairy: ['Cholov Yisroel', 'Cholov Stam'],
          general: ['Pas Yisroel', 'Yoshon', 'Kemach Yoshon']
        }
      },
      message: error instanceof Error && (
        error.name === 'AbortError' || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('network')
      ) ? 'Kosher types service temporarily unavailable' : 'Using default kosher types'
    });
  }
} 