import { NextRequest } from 'next/server';
import { getBackendUrl, createSuccessResponse } from '@/lib';
import { withRateLimit, rateLimitConfigs } from '@/lib/utils/rateLimiter';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'shtetl-listing-detail');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = params;
  try {
    const listingId = parseInt(id);

    if (isNaN(listingId)) {
      return createSuccessResponse({
        success: false,
        message: 'Invalid listing ID'
      }, undefined, 400);
    }

    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/v4/shtetl/listings/${listingId}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return createSuccessResponse({
        success: false,
        message: errorData.error || 'Failed to fetch listing details'
      }, undefined, response.status);
    }

    const data = await response.json();
    return createSuccessResponse({
      success: true,
      data: data.data
    });

  } catch (error) {
    console.error('Error fetching shtetl listing details:', error);
    return createSuccessResponse({
      success: false,
      message: 'Internal server error'
    }, undefined, 500);
  }
}
