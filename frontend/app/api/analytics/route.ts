import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsConfig, isGoogleAnalyticsConfigured } from '@/lib/utils/analytics-config';

// Ensure Node.js runtime and no caching for this lightweight endpoint
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Safely parse the request body (handle non-JSON and empty bodies)
    const reqClone = request.clone();
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      try {
        const text = await reqClone.text();
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }
    }
    
    // Validate the request structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const config = getAnalyticsConfig();
    
    // Handle batch events
    if ('events' in body && Array.isArray((body as any).events)) {
      const events = (body as any).events;
      const batchSize = (body as any).batch_size || events.length;
      const timestamp = (body as any).timestamp || Date.now();
      
      // Check if analytics is enabled
      if (!config.enabled) {
        return NextResponse.json({ 
          success: false, 
          error: 'Analytics is disabled' 
        }, { status: 400 });
      }
      
      // Validate batch size
      if (batchSize > config.batchSize) {
        return NextResponse.json({ 
          success: false, 
          error: `Batch size ${batchSize} exceeds maximum allowed size ${config.batchSize}` 
        }, { status: 400 });
      }
      
      // Validate events
      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json(
          { error: 'Invalid events array' },
          { status: 400 }
        );
      }

      // Process each event
      const processedEvents = events.map((event: any) => ({
        ...event,
        processed_at: new Date().toISOString(),
        batch_id: timestamp,
      }));

      // Log analytics events (in production, you'd send this to your analytics service)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] Processed ${processedEvents.length} events in batch ${timestamp}`);
      }

      // In production, you might want to:
      // 1. Send to Google Analytics via Measurement Protocol
      // 2. Store in your database
      // 3. Send to a third-party analytics service
      // 4. Process for real-time dashboards
      
      return NextResponse.json({ 
        success: true, 
        processed_events: processedEvents.length,
        batch_id: timestamp,
        message: 'Batch events processed successfully'
      });
    }

    // Handle single event (backward compatibility)
    if ('event' in body) {
      const event = body as any;
      
      // Validate the event structure
      if (!event.event || typeof event.event !== 'string') {
        return NextResponse.json(
          { error: 'Invalid event data' },
          { status: 400 }
        );
      }
      
      // Log analytics event (in production, you'd send this to your analytics service)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] Event: ${event.event}`, event.properties || {});
      }

      // Check if Google Analytics is properly configured
      if (!isGoogleAnalyticsConfigured()) {
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
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Analytics API Error:', error);
    // Don't fail the page due to analytics; return success=false but 200
    return NextResponse.json({ success: false, error: 'Failed to process analytics event' });
  }
}

export async function GET() {
  // Return analytics configuration or status
  const config = getAnalyticsConfig();
  const isGaConfigured = isGoogleAnalyticsConfigured();
  
  return NextResponse.json({
    enabled: config.enabled,
    provider: config.provider,
    googleAnalytics: {
      configured: isGaConfigured,
      measurementId: config.gaMeasurementId,
      enhancedEcommerce: config.gaEnhancedEcommerce,
      customDimensions: config.gaCustomDimensions,
    },
    tracking: {
      userId: config.trackUserId,
      sessionId: config.trackSessionId,
      performance: config.trackPerformance,
      errors: config.trackErrors,
    },
    api: {
      endpoint: config.apiEndpoint,
      batchSize: config.batchSize,
      flushInterval: config.flushInterval,
    },
    timestamp: new Date().toISOString(),
    message: isGaConfigured ? 'Analytics configured and ready' : 'Analytics not configured - GA measurement ID missing or invalid'
  });
}
