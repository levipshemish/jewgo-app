import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, rateLimitConfigs } from '@/lib/utils/rateLimiter';
import { createSuccessResponse } from '@/lib';
import { getBackendUrl } from '@/lib';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'marketplace-list');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const kind = searchParams.get('kind') || '';
    const condition = searchParams.get('condition') || '';
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const city = searchParams.get('city') || '';
    const region = searchParams.get('region') || '';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    const status = searchParams.get('status') || 'active';

    // Build query parameters for backend
    const backendParams = new URLSearchParams();
    backendParams.append('limit', limit.toString());
    backendParams.append('offset', offset.toString());
    
    if (search) backendParams.append('search', search);
    if (category) backendParams.append('category', category);
    if (subcategory) backendParams.append('subcategory', subcategory);
    if (kind) backendParams.append('kind', kind);
    if (condition) backendParams.append('condition', condition);
    if (minPrice) backendParams.append('min_price', minPrice);
    if (maxPrice) backendParams.append('max_price', maxPrice);
    if (city) backendParams.append('city', city);
    if (region) backendParams.append('region', region);
    if (lat) backendParams.append('lat', lat);
    if (lng) backendParams.append('lng', lng);
    if (radius) backendParams.append('radius', radius);
    if (status) backendParams.append('status', status);

    // Fetch marketplace listings from backend
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/v4/marketplace?${backendParams.toString()}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend marketplace list error:', errorText);
      return createSuccessResponse({
        success: false,
        message: 'Failed to fetch marketplace listings'
      }, undefined, response.status);
    }

    const data = await response.json();
    
    if (!data.success) {
      return createSuccessResponse({
        success: false,
        message: data.error || 'Failed to fetch marketplace listings'
      }, undefined, 500);
    }

    return createSuccessResponse('Marketplace listings retrieved successfully', data.data);

  } catch (error) {
    console.error('Marketplace list API error:', error);
    return createSuccessResponse({
      success: false,
      message: 'Internal server error'
    }, undefined, 500);
  }
}
