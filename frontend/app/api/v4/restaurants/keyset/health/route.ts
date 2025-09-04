import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = `${BACKEND_URL}/api/v4/restaurants/keyset/health`;
    
    console.log(`[Keyset Health API v4] Checking backend health at: ${backendUrl}`);
    
    // Make the request to the backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Keyset Health API v4] Backend health check failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { 
          error: 'Backend health check failed', 
          status: response.status,
          statusText: response.statusText,
          healthy: false
        },
        { status: response.status }
      );
    }

    // Get the response data
    const data = await response.json();
    
    console.log(`[Keyset Health API v4] Backend health check successful`);
    
    // Return the backend response with additional frontend health info
    return NextResponse.json({
      ...data,
      frontend: {
        healthy: true,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    });
    
  } catch (error) {
    console.error('[Keyset Health API v4] Error checking backend health:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        healthy: false,
        frontend: {
          healthy: false,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        }
      },
      { status: 500 }
    );
  }
}
