/**
 * Consolidated v5 metrics API routes.
 * 
 * Provides access to system metrics, health information, and public statistics
 * with appropriate caching and access controls.
 * Replaces: multiple metrics endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { validateAuthFromRequest } from '@/lib/api/utils-v5';

// GET /api/v5/metrics?type=health|public|client
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'health';

    switch (type) {
      case 'health':
        return handleHealthMetrics(request);
      
      case 'public':
        return handlePublicStats(request);
      
      case 'client':
        return handleClientMetrics(request);
      
      default:
        return NextResponse.json(
          { error: 'Invalid metrics type. Use: health, public, or client' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleHealthMetrics(_request: NextRequest) {
  try {
    // Health metrics are public but may be cached
    const response = await apiClient.getHealthMetrics();

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to fetch health metrics' },
        { status: 503 }
      );
    }

    // Add cache headers for health metrics
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120'); // 1 min cache

    return NextResponse.json(response.data, { headers });

  } catch (error) {
    console.error('Health metrics error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}

async function handlePublicStats(_request: NextRequest) {
  try {
    // Public stats are freely accessible
    const response = await apiClient.getPublicStats();

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to fetch public statistics' },
        { status: 500 }
      );
    }

    // Add longer cache headers for public stats
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); // 5 min cache

    return NextResponse.json(response.data, { headers });

  } catch (error) {
    console.error('Public stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public statistics' },
      { status: 500 }
    );
  }
}

async function handleClientMetrics(request: NextRequest) {
  try {
    // Client metrics require authentication
    const authResult = await validateAuthFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Get client-side metrics from the metrics collector
    const { metricsCollector } = await import('@/lib/api/metrics-v5');
    
    const searchParams = request.nextUrl.searchParams;
    const timeRange = parseTimeRange(searchParams);
    
    const summary = metricsCollector.getSummary(timeRange);

    // Add no-cache headers for client metrics (real-time data)
    const headers = new Headers();
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return NextResponse.json({
      client_metrics: summary,
      timestamp: new Date().toISOString()
    }, { headers });

  } catch (error) {
    console.error('Client metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client metrics' },
      { status: 500 }
    );
  }
}

function parseTimeRange(searchParams: URLSearchParams): { start: number; end: number } | undefined {
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  
  if (start && end) {
    const startTime = parseInt(start);
    const endTime = parseInt(end);
    
    if (!isNaN(startTime) && !isNaN(endTime) && startTime < endTime) {
      return { start: startTime, end: endTime };
    }
  }
  
  return undefined;
}