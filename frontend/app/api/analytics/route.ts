import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const event = await request.json();
    
    // Validate the event structure
    if (!event || typeof event !== 'object') {
      return NextResponse.json(
        { error: 'Invalid event data' },
        { status: 400 }
      );
    }
    
    // Log analytics event (in production, you'd send this to your analytics service)
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics event received:', event);
    }

    // Check if Google Analytics is properly configured
    const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!gaMeasurementId || gaMeasurementId === 'G-XXXXXXXXXX') {
      // Analytics not configured, but don't fail the request
      return NextResponse.json({ 
        success: true, 
        message: 'Analytics not configured' 
      });
    }

    // In production, you might want to:
    // 1. Send to Google Analytics via Measurement Protocol
    // 2. Store in your database
    // 3. Send to a third-party analytics service
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics event' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return analytics configuration or status
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const isGaConfigured = gaMeasurementId && gaMeasurementId !== 'G-XXXXXXXXXX';
  
  return NextResponse.json({
    enabled: true,
    googleAnalytics: isGaConfigured,
    timestamp: new Date().toISOString(),
    message: isGaConfigured ? 'Analytics configured' : 'Analytics not configured - GA measurement ID missing or invalid'
  });
}
