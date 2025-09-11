/**
 * Consolidated v5 search API route.
 * 
 * Provides unified search functionality across all entity types with
 * advanced filtering, faceted search, and suggestion capabilities.
 * Replaces: multiple search endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { isValidEntityType, parseLocationFromParams } from '@/lib/api/utils-v5';
import type { EntityType } from '@/lib/api/types-v5';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    // Validate search query
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Parse entity types
    const typesParam = searchParams.get('types');
    let entityTypes: EntityType[] | undefined;
    
    if (typesParam) {
      const types = typesParam.split(',').map(t => t.trim());
      const validTypes = types.filter(isValidEntityType) as EntityType[];
      
      if (validTypes.length === 0) {
        return NextResponse.json(
          { error: 'No valid entity types provided' },
          { status: 400 }
        );
      }
      
      entityTypes = validTypes;
    }

    // Parse location
    const location = parseLocationFromParams(searchParams);

    // Parse other options
    const includeFacets = searchParams.get('facets') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const cursor = searchParams.get('cursor') || undefined;

    // Parse filters
    const filters: Record<string, any> = {};
    
    // Entity-specific filters
    if (searchParams.get('cuisine')) filters.cuisine = searchParams.get('cuisine');
    if (searchParams.get('kosher_cert')) filters.kosher_cert = searchParams.get('kosher_cert');
    if (searchParams.get('price_range')) filters.price_range = searchParams.get('price_range');
    if (searchParams.get('denomination')) filters.denomination = searchParams.get('denomination');
    if (searchParams.get('services')) filters.services = searchParams.get('services');
    if (searchParams.get('store_type')) filters.store_type = searchParams.get('store_type');
    if (searchParams.get('specialties')) filters.specialties = searchParams.get('specialties');
    if (searchParams.get('features')) filters.features = searchParams.get('features');

    // Call backend search API through client
    const response = await apiClient.search(
      query.trim(),
      entityTypes,
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

    // Add cache headers (shorter cache for search results)
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=300'); // 3 min cache

    return NextResponse.json(response.data, { headers });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}