import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Dynamic API Route: /api/shtel/store/[...path]
 * 
 * Handles all shtel store-related API requests and proxies them to the backend.
 * 
 * @param request - The incoming request
 * @param params - The dynamic path parameters
 * @returns JSON response from the backend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleShtelStoreRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleShtelStoreRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleShtelStoreRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleShtelStoreRequest(request, params, 'DELETE');
}

async function handleShtelStoreRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
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

    // Get the path parameters
    const { path } = await params;
    
    // Get backend URL from environment
    const backendUrl = getBackendUrl();
    
    // Construct the backend URL path
    const pathString = path.join('/');
    const backendPath = `/api/v4/shtetl/stores/${pathString}`;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const fullBackendUrl = `${backendUrl}${backendPath}${queryString ? `?${queryString}` : ''}`;
    
    // Prepare request body for POST/PUT requests
    let body: string | undefined;
    if (method === 'POST' || method === 'PUT') {
      try {
        const requestBody = await request.json();
        body = JSON.stringify(requestBody);
      } catch {
        // No body or invalid JSON, continue without body
      }
    }
    
    // Forward the request to the backend with authentication
    const backendResponse = await fetch(fullBackendUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body,
    });

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
        message: 'Failed to process store request'
      },
      { status: 500 }
    );
  }
}
