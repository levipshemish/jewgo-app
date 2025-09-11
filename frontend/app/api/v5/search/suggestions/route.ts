/**
 * Search suggestions API route.
 * 
 * Provides autocomplete suggestions for search queries with
 * entity-specific suggestions and caching for performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { isValidEntityType } from '@/lib/api/utils-v5';
import type { EntityType } from '@/lib/api/types-v5';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    // Validate search query
    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        suggestions: [],
        count: 0,
        query: query || ''
      });
    }

    // Parse entity type (optional)
    const entityTypeParam = searchParams.get('type');
    let entityType: EntityType | undefined;
    
    if (entityTypeParam) {
      if (!isValidEntityType(entityTypeParam)) {
        return NextResponse.json(
          { error: 'Invalid entity type' },
          { status: 400 }
        );
      }
      entityType = entityTypeParam as EntityType;
    }

    // Parse limit
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    // Call backend suggestions API through client
    const response = await apiClient.getSearchSuggestions(
      query.trim(),
      entityType,
      limit
    );

    if (!response.success) {
      // Return empty suggestions on error rather than failing
      return NextResponse.json({
        suggestions: [],
        count: 0,
        query: query.trim()
      });
    }

    // Add aggressive cache headers for suggestions
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200'); // 10 min cache

    return NextResponse.json(response.data, { headers });

  } catch (error) {
    console.error('Search suggestions API error:', error);
    
    // Return empty suggestions on error
    return NextResponse.json({
      suggestions: [],
      count: 0,
      query: request.nextUrl.searchParams.get('q') || ''
    });
  }
}