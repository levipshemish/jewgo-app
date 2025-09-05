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
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'mikvah-detail');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await params;
  try {
    const mikvahId = parseInt(id);
    
    if (isNaN(mikvahId)) {
      return createSuccessResponse({
        success: false,
        message: 'Invalid mikvah ID'
      }, undefined, 400);
    }

    // Fetch mikvah data from backend
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/v4/mikvah/${mikvahId}`;

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
          message: 'Mikvah facility not found'
        }, undefined, 404);
      }
      
      const errorText = await response.text();
      console.error('Backend mikvah detail error:', errorText);
      return createSuccessResponse({
        success: false,
        message: 'Failed to fetch mikvah details'
      }, undefined, response.status);
    }

    const data = await response.json();
    
    if (!data.success) {
      return createSuccessResponse({
        success: false,
        message: data.error || 'Failed to fetch mikvah details'
      }, undefined, 500);
    }

    return createSuccessResponse('Mikvah details retrieved successfully', data.data);

  } catch (error) {
    console.error('Mikvah detail API error:', error);
    return createSuccessResponse({
      success: false,
      message: 'Internal server error'
    }, undefined, 500);
  }
}
