/**
 * Analytics API route - redirects to V5 admin analytics API
 * 
 * This route provides backward compatibility for the legacy /api/analytics endpoint
 * by proxying requests to the V5 admin analytics API.
 */

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

    // Call backend V5 admin analytics API directly
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    const apiUrl = `${backendUrl}/api/v5/admin/analytics?${queryParams}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch analytics' },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    return NextResponse.json(responseData);

  } catch (error) {
    return simpleErrorHandler(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: 'Request body required' },
        { status: 400 }
      );
    }

    // For analytics POST requests, we might want to track events or update metrics
    // For now, we'll return a success response indicating the data was received
    // In the future, this could be extended to handle specific analytics events
    
    console.log('Analytics POST data received:', body);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Analytics data received',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    return simpleErrorHandler(error);
  }
}
