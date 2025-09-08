/**
 * Frontend metrics endpoint for Prometheus scraping
 * Provides Next.js application metrics
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory metrics store
const metrics = {
  pageViews: 0,
  apiCalls: 0,
  errors: 0,
  startTime: Date.now(),
  lastReset: Date.now()
};

// Prometheus format metrics
function generatePrometheusMetrics(): string {
  const uptime = (Date.now() - metrics.startTime) / 1000;
  
  return `# HELP jewgo_frontend_page_views_total Total page views
# TYPE jewgo_frontend_page_views_total counter
jewgo_frontend_page_views_total ${metrics.pageViews}

# HELP jewgo_frontend_api_calls_total Total API calls
# TYPE jewgo_frontend_api_calls_total counter
jewgo_frontend_api_calls_total ${metrics.apiCalls}

# HELP jewgo_frontend_errors_total Total errors
# TYPE jewgo_frontend_errors_total counter
jewgo_frontend_errors_total ${metrics.errors}

# HELP jewgo_frontend_uptime_seconds Application uptime in seconds
# TYPE jewgo_frontend_uptime_seconds gauge
jewgo_frontend_uptime_seconds ${uptime}

# HELP jewgo_frontend_info Application information
# TYPE jewgo_frontend_info gauge
jewgo_frontend_info{version="1.0.0",environment="production"} 1
`;
}

export async function GET(_request: NextRequest) {
  try {
    const prometheusMetrics = generatePrometheusMetrics();
    
    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return new NextResponse('Error generating metrics', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value = 1 } = body;
    
    switch (type) {
      case 'page_view':
        metrics.pageViews += value;
        break;
      case 'api_call':
        metrics.apiCalls += value;
        break;
      case 'error':
        metrics.errors += value;
        break;
      case 'reset':
        metrics.pageViews = 0;
        metrics.apiCalls = 0;
        metrics.errors = 0;
        metrics.lastReset = Date.now();
        break;
      default:
        return new NextResponse('Invalid metric type', { status: 400 });
    }
    
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error updating metrics:', error);
    return new NextResponse('Error updating metrics', { status: 500 });
  }
}
