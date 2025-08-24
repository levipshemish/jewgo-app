import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo-app-oyoh.onrender.com';

export async function GET(_request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Check backend health with retry logic
    let healthResponse;
    let lastError;
    
    // Try multiple times for backend health check (common for cold starts)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        healthResponse = await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          headers: {
            'User-Agent': 'JewGo-Frontend-Health-Check/1.0',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(attempt === 1 ? 20000 : 30000), // Longer timeout on retries to handle cold starts
        });
        
        // If we get a response, break out of retry loop
        break;
      } catch (_error) {
        lastError = _error;
        if (attempt < 3) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }
    
    // If all attempts failed, throw the last error
    if (!healthResponse) {
      throw lastError || new Error('All health check attempts failed');
    }

    const responseTime = Date.now() - startTime;
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      
      return NextResponse.json({
        status: 'healthy',
        frontend: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        backend: {
          ...healthData,
          response_time_ms: responseTime,
        },
        overall: 'healthy',
      }, { status: 200 });
    } else {
      // Try to get error details from response
      let errorDetails = `HTTP ${healthResponse.status}`;
      try {
        const errorData = await healthResponse.text();
        if (errorData) {
          errorDetails += `: ${errorData}`;
        }
      } catch {
        // Ignore if we can't read the error response
      }
      
      return NextResponse.json({
        status: 'degraded',
        frontend: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        backend: {
          status: 'unhealthy',
          error: errorDetails,
          response_time_ms: responseTime,
          note: 'Backend may be cold-starting or under high load',
        },
        overall: 'degraded',
        message: 'Frontend is operational, backend connectivity issues detected',
      }, { status: 200 }); // Return 200 instead of 503 for degraded service
    }
    
  } catch (error) {
    // // console.error('Health check error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('AbortError');
    
    return NextResponse.json({
      status: 'unhealthy',
      frontend: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      backend: {
        status: 'unhealthy',
        error: errorMessage,
        note: isTimeout 
          ? 'Backend is likely cold-starting. This is normal for free hosting services.'
          : 'Backend connection failed. Service may be temporarily unavailable.',
      },
      overall: 'unhealthy',
      message: 'Frontend is operational, backend is unreachable',
      recommendation: isTimeout 
        ? 'Try again in 30-60 seconds as the service warms up.'
        : 'Please try again later.',
    }, { status: 200 }); // Return 200 with error details instead of 503
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'warm-up') {
      // Make a request to wake up the backend
      const warmUpResponse = await fetch(`${BACKEND_URL}/`, {
        method: 'GET',
        headers: {
          'User-Agent': 'JewGo-Frontend-Warm-Up/1.0',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(25000), // 25 second timeout for warm-up to handle cold starts
      });
      
      if (warmUpResponse.ok) {
        return NextResponse.json({
          status: 'success',
          message: 'Backend warm-up successful',
          timestamp: new Date().toISOString(),
        }, { status: 200 });
      } else {
        return NextResponse.json({
          status: 'error',
          message: `Backend warm-up failed: HTTP ${warmUpResponse.status}`,
          timestamp: new Date().toISOString(),
        }, { status: 503 });
      }
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Invalid action',
    }, { status: 400 });
    
  } catch (_error) {
    // // console.error('Warm-up error:', _error);
    
    return NextResponse.json({
      status: 'error',
      message: _error instanceof Error ? _error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
