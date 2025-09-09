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
    // Since there's no backend kosher-types endpoint, return default kosher types
    // This ensures the UI continues to work without errors
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
      message: 'Using default kosher types - backend endpoint not implemented'
    });

  } catch (error) {
    // For any errors, return default kosher types to ensure UI works
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
} 