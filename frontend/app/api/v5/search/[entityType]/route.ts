/**
 * Entity-specific search API route.
 * 
 * Provides search functionality within a specific entity type with
 * specialized filtering and faceted search capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { isValidEntityType, parseLocationFromParams } from '@/lib/api/utils-v5';
import type { EntityType } from '@/lib/api/types-v5';

export async function GET(
  request: NextRequest,
  { params }: { params: { entityType: string } }
) {
  try {
    const { entityType } = params;
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    // Validate entity type
    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // Validate search query
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Parse location
    const location = parseLocationFromParams(searchParams);

    // Parse other options
    const includeFacets = searchParams.get('facets') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const cursor = searchParams.get('cursor') || undefined;

    // Parse entity-specific filters
    const filters: Record<string, any> = {};
    
    switch (entityType) {
      case 'restaurants':
        if (searchParams.get('cuisine')) filters.cuisine = searchParams.get('cuisine');
        if (searchParams.get('kosher_cert')) filters.kosher_cert = searchParams.get('kosher_cert');
        if (searchParams.get('price_range')) filters.price_range = searchParams.get('price_range');
        if (searchParams.get('features')) filters.features = searchParams.get('features');
        if (searchParams.get('rating_min')) filters.rating_min = parseFloat(searchParams.get('rating_min')!);
        break;

      case 'synagogues':
        if (searchParams.get('denomination')) filters.denomination = searchParams.get('denomination');
        if (searchParams.get('services')) filters.services = searchParams.get('services');
        if (searchParams.get('languages')) filters.languages = searchParams.get('languages');
        if (searchParams.get('accessibility')) filters.accessibility = searchParams.get('accessibility');
        break;

      case 'mikvahs':
        if (searchParams.get('supervision')) filters.supervision = searchParams.get('supervision');
        if (searchParams.get('features')) filters.features = searchParams.get('features');
        if (searchParams.get('appointment_required') !== null) {
          filters.appointment_required = searchParams.get('appointment_required') === 'true';
        }
        break;

      case 'stores':
        if (searchParams.get('store_type')) filters.store_type = searchParams.get('store_type');
        if (searchParams.get('specialties')) filters.specialties = searchParams.get('specialties');
        if (searchParams.get('payment_methods')) filters.payment_methods = searchParams.get('payment_methods');
        if (searchParams.get('enable_ecommerce') !== null) {
          filters.enable_ecommerce = searchParams.get('enable_ecommerce') === 'true';
        }
        break;
    }

    // Call backend entity-specific search API through client
    const response = await apiClient.searchEntity(
      entityType as EntityType,
      query.trim(),
      {
        location,
        includeFacets,
        filters,
        pagination: {
          cursor,
          limit
        }
      }
    );

    if (!response.success) {
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    // Add cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=300'); // 3 min cache

    return NextResponse.json(response.data, { headers });

  } catch (error) {
    console.error('Entity search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}