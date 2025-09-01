import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * API Route: GET /api/shtel/orders
 * 
 * Get shtel orders for the current user.
 * 
 * @param request - The incoming request
 * @returns JSON response with orders data
 */
export async function GET(request: NextRequest) {
  try {
    // Get the Supabase session
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to access your orders'
      }, { status: 401 });
    }

    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo-app-oyoh.onrender.com';
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward the request to the backend with authentication
    const backendResponse = await fetch(
      `${backendUrl}/api/v4/shtetl/orders?${queryString}`,
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
          message: 'Orders service is currently unavailable'
        },
        { status: 503 }
      );
    }

    // For server errors, return empty orders
    if (!backendResponse.ok && backendResponse.status >= 500) {
      return NextResponse.json({
        success: true,
        data: {
          orders: [],
          total: 0
        },
        message: 'Orders service temporarily unavailable'
      });
    }

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in shtel orders API route:', error);
    
    // For network errors, return empty orders
    return NextResponse.json({
      success: true,
      data: {
        orders: [],
        total: 0
      },
      message: error instanceof Error && (
        error.name === 'AbortError' || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('network')
      ) ? 'Orders service temporarily unavailable' : 'No orders available'
    });
  }
}
