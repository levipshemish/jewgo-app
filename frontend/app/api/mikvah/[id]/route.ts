import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
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
        return createErrorResponse('Mikvah facility not found', 404);
      }
      
      const errorText = await response.text();
      console.error('Backend mikvah detail error:', errorText);
      return createErrorResponse('Failed to fetch mikvah details', response.status);
    }

    const data = await response.json();
    
    if (!data.success) {
      return createErrorResponse(data.error || 'Failed to fetch mikvah details', 500);
    }

    return createSuccessResponse('Mikvah details retrieved successfully', data.data);

  } catch (error) {
    console.error('Mikvah detail API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
