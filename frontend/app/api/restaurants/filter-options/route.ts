import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';

export async function GET(_request: NextRequest) {
  try {
    // Call the v5 API with include_filter_options=true to get filter options
    const response = await apiClient.getEntities(
      'restaurants',
      {}, // no filters
      {
        limit: 1, // minimal data needed
        includeFilterOptions: true
      }
    );

    if (!response) {
      return NextResponse.json(
        { error: 'Failed to fetch filter options' },
        { status: 500 }
      );
    }

    // The API client returns response.data, which contains the full backend response
    // The filterOptions should be at the top level of the response
    const filterOptions = response.filterOptions || {};

    return NextResponse.json({
      success: true,
      data: filterOptions
    });

  } catch (error) {
    console.error('Filter options API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
