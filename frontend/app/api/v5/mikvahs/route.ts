/**
 * V5 Mikvahs API route - direct access to mikvahs
 * 
 * This route provides direct access to mikvahs without going through
 * the generic entities route for better performance and simpler URLs.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;

    // Call backend directly
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    const url = `${backendUrl}/api/v5/mikvahs?${new URLSearchParams(Object.fromEntries(request.nextUrl.searchParams)).toString()}`;
    
    console.log('Frontend calling backend URL:', url);
    
    const response = await fetch(url);
    console.log('Backend response status:', response.status);
    
    const data = await response.json();
    console.log('Backend response data:', data);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch mikvahs from backend', status: response.status, url, data },
        { status: response.status }
      );
    }

    // Add cache headers for GET requests
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

    return NextResponse.json(data, { headers });

  } catch (error) {
    console.error('Mikvahs API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: 'Request body required' },
        { status: 400 }
      );
    }

    // Call backend directly
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    const url = `${backendUrl}/api/v5/mikvahs`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to create mikvah', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Create mikvah API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
