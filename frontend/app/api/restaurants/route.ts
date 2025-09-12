/**
 * Legacy restaurants API route - redirects to V5 API
 * 
 * This route provides backward compatibility for the legacy /api/restaurants endpoint
 * by proxying requests to the V5 API.
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

    // Restaurant-specific filters
    if (searchParams.get('cuisine')) filters.cuisine_type = searchParams.get('cuisine')!;
    if (searchParams.get('price_range')) filters.price_range = parseInt(searchParams.get('price_range')!);
    if (searchParams.get('kosher_cert')) filters.kosher_certification = searchParams.get('kosher_cert')!;

    // Pagination
    if (searchParams.get('cursor')) pagination.cursor = searchParams.get('cursor')!;
    if (searchParams.get('limit')) pagination.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('sort')) pagination.sort = searchParams.get('sort')! as any;
    if (searchParams.get('page')) pagination.page = parseInt(searchParams.get('page')!);

    // Call backend V5 API directly
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'location' && typeof value === 'object') {
          queryParams.append('latitude', value.latitude.toString());
          queryParams.append('longitude', value.longitude.toString());
          if (value.radius) {
            queryParams.append('radius', value.radius.toString());
          }
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    // Add pagination to query params
    if (pagination.cursor) queryParams.append('cursor', pagination.cursor);
    if (pagination.limit) queryParams.append('limit', pagination.limit.toString());
    if (pagination.sort) queryParams.append('sort', pagination.sort);
    
    const apiUrl = `${backendUrl}/api/v5/restaurants?${queryParams.toString()}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();

    if (!responseData) {
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      );
    }

    // Add cache headers for GET requests
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    // Pass through ETag from backend if available
    if (response.headers.get('etag')) {
      headers.set('ETag', response.headers.get('etag')!);
    }

    return NextResponse.json(responseData, { headers });

  } catch (error) {
    console.error('Restaurants API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Call backend V5 API directly
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    const apiUrl = `${backendUrl}/api/v5/restaurants`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add authentication token if available
    if (authResult.token) {
      headers['Authorization'] = `Bearer ${authResult.token}`;
    }
    
    // Add idempotency key if provided
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to create restaurant' },
        { status: response.status }
      );
    }
    
    const responseData = await response.json();
    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('Create restaurant API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
