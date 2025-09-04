import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';

export async function GET(request: NextRequest) {
  try {
    // Get the search params from the request
    const { searchParams } = new URL(request.url);
    
    // Forward all query parameters to the backend
    const backendUrl = `${BACKEND_URL}/api/v4/restaurants/keyset/list?${searchParams.toString()}`;
    
    console.log(`[Keyset API v4] Forwarding request to: ${backendUrl}`);
    
    // Make the request to the backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers if present
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        }),
      },
    });

    if (!response.ok) {
      console.error(`[Keyset API v4] Backend error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { 
          error: 'Backend request failed', 
          status: response.status,
          statusText: response.statusText 
        },
        { status: response.status }
      );
    }

    // Get the response data
    const data = await response.json();
    
    console.log(`[Keyset API v4] Successfully forwarded response from backend`);
    
    // Return the backend response
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Keyset API v4] Error forwarding request to backend:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
