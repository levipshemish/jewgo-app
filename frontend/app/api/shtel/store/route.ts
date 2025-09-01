import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * API Route: GET /api/shtel/store
 * 
 * Get the current user's store data.
 * 
 * @param request - The incoming request
 * @returns JSON response with store data
 */
export async function GET(_request: NextRequest) {
  try {
    // Get the Supabase session
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to access your store'
      }, { status: 401 });
    }

    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo-app-oyoh.onrender.com';
    
    // Forward the request to the backend with authentication
    const backendResponse = await fetch(
      `${backendUrl}/api/v4/shtetl/stores/my-store`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    // Check if response is JSON
    const contentType = backendResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Backend service unavailable',
          message: 'Store service is currently unavailable'
        },
        { status: 503 }
      );
    }

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error('Error in shtel store API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch store data'
      },
      { status: 500 }
    );
  }
}
