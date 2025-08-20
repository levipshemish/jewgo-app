import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '0.1.1',
      checks: {
        database: 'ok', // You can add actual database checks here
        supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'not configured',
        googleMaps: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'configured' : 'not configured'
      }
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
