import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, rateLimitConfigs } from '@/lib/utils/rateLimiter';
import { createSuccessResponse } from '@/lib';
import { getBackendUrl } from '@/lib';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'store-detail');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await params;
  try {
    const storeId = parseInt(id);
    
    if (isNaN(storeId)) {
      return createSuccessResponse({
        success: false,
        message: 'Invalid store ID'
      }, undefined, 400);
    }

    // Fetch store data from backend
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/v4/stores/${storeId}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return createSuccessResponse({
          success: false,
          message: 'Store not found'
        }, undefined, 404);
      }
      
      const errorText = await response.text();
      console.error('Backend store detail error:', errorText);
      return createSuccessResponse({
        success: false,
        message: 'Failed to fetch store details'
      }, undefined, response.status);
    }

    const data = await response.json();
    
    if (!data.success) {
      return createSuccessResponse({
        success: false,
        message: data.error || 'Failed to fetch store details'
      }, undefined, 500);
    }

    return createSuccessResponse('Store details retrieved successfully', data.data);

  } catch (error) {
    console.error('Store detail API error:', error);
    return createSuccessResponse({
      success: false,
      message: 'Internal server error'
    }, undefined, 500);
  }
}
