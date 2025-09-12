/**
 * V5 Synagogues API route - direct access to synagogues
 * 
 * This route provides direct access to synagogues without going through
 * the generic entities route for better performance and simpler URLs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { validateAuthFromRequest } from '@/lib/api/utils-v5';
import type { EntityFilters, PaginationOptions } from '@/lib/api/types-v5';

export async function GET(request: NextRequest) {
  try {
    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: EntityFilters = {};
    const pagination: PaginationOptions = {};

    // Extract filters
    if (searchParams.get('search')) filters.search = searchParams.get('search')!;
    if (searchParams.get('status')) filters.status = searchParams.get('status')!;
    if (searchParams.get('category')) filters.category = searchParams.get('category')!;
    if (searchParams.get('created_after')) filters.createdAfter = searchParams.get('created_after')!;
    if (searchParams.get('updated_after')) filters.updatedAfter = searchParams.get('updated_after')!;

    // Location filters
    const latitude = searchParams.get('latitude') || searchParams.get('lat');
    const longitude = searchParams.get('longitude') || searchParams.get('lng');
    const radius = searchParams.get('radius');
    
    if (latitude && longitude) {
      filters.location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius ? parseFloat(radius) : undefined
      };
    }

    // Synagogue-specific filters
    if (searchParams.get('denomination')) filters.denomination = searchParams.get('denomination')!;
    if (searchParams.get('services')) filters.services = searchParams.get('services')!;

    // Pagination
    if (searchParams.get('cursor')) pagination.cursor = searchParams.get('cursor')!;
    if (searchParams.get('limit')) pagination.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('sort')) pagination.sort = searchParams.get('sort')! as any;
    if (searchParams.get('page')) pagination.page = parseInt(searchParams.get('page')!);

    // Call backend directly for now (API client has issues)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const url = `${backendUrl}/api/v5/synagogues?${new URLSearchParams(Object.fromEntries(request.nextUrl.searchParams)).toString()}`;
    
    console.log('Frontend calling backend URL:', url);
    
    const response = await fetch(url);
    console.log('Backend response status:', response.status);
    
    const data = await response.json();
    console.log('Backend response data:', data);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch synagogues from backend', status: response.status, url, data },
        { status: response.status }
      );
    }

    // Add cache headers for GET requests
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    // ETag would need to be passed from backend
    // if (response.headers?.etag) {
    //   headers.set('ETag', response.headers.etag);
    // }

    return NextResponse.json(data, { headers });

  } catch (error) {
    console.error('Synagogues API error:', error);
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
    // Validate authentication for write operations
    const authResult = await validateAuthFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Parse request body
    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: 'Request body required' },
        { status: 400 }
      );
    }

    // Set authentication token for backend call
    if (authResult.token) {
      apiClient.setTokens(authResult.token);
    }

    // Call backend API through client
    const response = await apiClient.createEntity(
      'synagogues',
      body,
      {
        idempotencyKey: request.headers.get('idempotency-key') || undefined
      }
    );

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to create synagogue' },
        { status: 400 }
      );
    }

    return NextResponse.json(response.data, { status: 201 });

  } catch (error) {
    console.error('Create synagogue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
