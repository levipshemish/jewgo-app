import { NextRequest } from 'next/server';
import { withRateLimit, rateLimitConfigs } from '@/lib/utils/rateLimiter';
import { createSuccessResponse } from '@/lib';
import { getBackendUrl } from '@/lib';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'stores-list');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const storeType = searchParams.get('store_type') || '';
    const storeCategory = searchParams.get('store_category') || '';
    const kosherAgency = searchParams.get('kosher_agency') || '';
    const isActive = searchParams.get('is_active');
    const isVerified = searchParams.get('is_verified');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const maxDistanceMi = searchParams.get('maxDistanceMi');

    // Build query parameters for backend
    const backendParams = new URLSearchParams();
    backendParams.append('limit', limit.toString());
    backendParams.append('offset', offset.toString());
    
    if (search) backendParams.append('search', search);
    if (city) backendParams.append('city', city);
    if (state) backendParams.append('state', state);
    if (storeType) backendParams.append('store_type', storeType);
    if (storeCategory) backendParams.append('store_category', storeCategory);
    if (kosherAgency) backendParams.append('kosher_agency', kosherAgency);
    if (isActive !== null) backendParams.append('is_active', isActive);
    if (isVerified !== null) backendParams.append('is_verified', isVerified);
    if (lat) backendParams.append('lat', lat);
    if (lng) backendParams.append('lng', lng);
    if (maxDistanceMi) backendParams.append('maxDistanceMi', maxDistanceMi);

    // Fetch stores from backend
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/v4/stores?${backendParams.toString()}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend stores list error:', errorText);
      return createSuccessResponse({
        success: false,
        message: 'Failed to fetch stores'
      }, undefined, response.status);
    }

    const data = await response.json();
    
    if (!data.success) {
      return createSuccessResponse({
        success: false,
        message: data.error || 'Failed to fetch stores'
      }, undefined, 500);
    }

    return createSuccessResponse('Stores retrieved successfully', data.data);

  } catch (error) {
    console.error('Stores list API error:', error);
    return createSuccessResponse({
      success: false,
      message: 'Internal server error'
    }, undefined, 500);
  }
}
