import { NextRequest } from 'next/server';
import { withRateLimit, rateLimitConfigs } from '@/lib/utils/rateLimiter';
import { createSuccessResponse } from '@/lib';
import { getBackendUrl } from '@/lib';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'marketplace-detail');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { id } = params;

    if (!id) {
      return createSuccessResponse({
        success: false,
        message: 'Listing ID is required'
      }, undefined, 400);
    }

    // Fetch marketplace listing details from backend
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/v4/marketplace/${id}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend marketplace detail error:', errorText);
      return createSuccessResponse({
        success: false,
        message: 'Failed to fetch marketplace listing details'
      }, undefined, response.status);
    }

    const data = await response.json();
    
    if (!data.success) {
      return createSuccessResponse({
        success: false,
        message: data.error || 'Failed to fetch marketplace listing details'
      }, undefined, 500);
    }

    return createSuccessResponse('Marketplace listing details retrieved successfully', data.data);

  } catch (error) {
    console.error('Marketplace detail API error:', error);
    return createSuccessResponse({
      success: false,
      message: 'Internal server error'
    }, undefined, 500);
  }
}
