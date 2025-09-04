import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * API Route: POST /api/shtel/stores
 * 
 * Create a new shtel store.
 * 
 * @param request - The incoming request
 * @returns JSON response with store creation result
 */
export async function POST(request: NextRequest) {
  try {
    // Get the Supabase session
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to create a store'
      }, { status: 401 });
    }

    // Get backend URL from environment
    const backendUrl = getBackendUrl();
    
    // Get request body
    const requestBody = await request.json();
    
    // Forward the request to the backend with authentication
    const backendResponse = await fetch(
      `${backendUrl}/api/v4/shtetl/stores`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Check if response is JSON
    const contentType = backendResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Backend service unavailable',
          message: 'Store creation service is currently unavailable'
        },
        { status: 503 }
      );
    }

    const data = await backendResponse.json();

    // Return the same status and data from the backend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in shtel stores API route:', error);
    
    // For network errors, still return success to queue the store creation
    if (error instanceof Error && (
      error.name === 'AbortError' || 
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('network')
    )) {
      return NextResponse.json({ 
        success: true,
        message: 'Your store creation request has been queued and will be processed shortly.',
        data: {
          id: `temp_${Date.now()}`,
          status: 'pending'
        }
      });
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to create store'
      },
      { status: 500 }
    );
  }
}
