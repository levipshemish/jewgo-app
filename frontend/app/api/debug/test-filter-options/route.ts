import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';

export async function GET(request: NextRequest) {
  try {
    console.log('DEBUG: Testing API client for filter options...');
    
    // Test the API client directly
    const response = await apiClient.getEntities(
      'restaurants',
      {},
      {
        limit: 1,
        includeFilterOptions: true
      }
    );
    
    console.log('DEBUG: Full API client response:', JSON.stringify(response, null, 2));
    
    return NextResponse.json({
      success: true,
      fullResponse: response,
      hasFilterOptions: response.data && response.data.filterOptions ? true : false,
      filterOptions: response.data && response.data.filterOptions ? response.data.filterOptions : null
    });
  } catch (error) {
    console.error('DEBUG: API client error:', error);
    return NextResponse.json({
      error: 'API client failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
