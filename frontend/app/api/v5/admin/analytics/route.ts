import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/api/auth-middleware';
import { simpleErrorHandler } from '@/lib/api/error-middleware';
import { ApiClientV5 } from '@/lib/api/client-v5';

const apiClient = new ApiClientV5();

export async function GET(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d, 90d, 1y
    const metric = searchParams.get('metric') || 'all'; // all, users, entities, views, searches
    const granularity = searchParams.get('granularity') || 'day'; // hour, day, week, month

    // Build query parameters
    const queryParams = new URLSearchParams({
      period,
      metric,
      granularity
    });

    // Call backend API
    const response = await apiClient.get(`/api/v5/admin/analytics?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${authResult.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.success) {
      return NextResponse.json(response, { status: response.status || 500 });
    }

    return NextResponse.json(response.data);

  } catch (error) {
    return simpleErrorHandler(error);
  }
}
