import { NextRequest, NextResponse} from 'next/server';
// import { 
//   checkRateLimit} from '@/lib/rate-limiting'; // TODO: Implement rate limiting
import { 
  generateCorrelationId} from '@/lib/utils/auth-utils';
// import { 
//   validateTrustedIP} from '@/lib/utils/auth-utils'; // TODO: Implement IP validation
// import { 
//   hashIPForPrivacy, validateCSRFServer} from '@/lib/utils/auth-utils.server'; // TODO: Implement security features
import { 
  ALLOWED_ORIGINS, getCORSHeaders} from '@/lib/config/environment';
import { initializeServer} from '@/lib/server-init';


// export const runtime = 'nodejs';

/**
 * Merge anonymous user API with versioned HMAC cookie verification
 * Handles OPTIONS/CORS preflight and POST requests for user merging
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin || undefined)
  });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  // const startTime = Date.now();
  
  // Initialize server-side functionality
  const serverInitialized = await initializeServer();
  if (!serverInitialized) {
    console.error(`Server initialization failed for correlation ID: ${correlationId}`, {
      correlationId
    });
    
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE' },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
  
  // Validate origin against allowlist
  const origin = request.headers.get('origin') || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json(
      { error: 'CSRF' },
      { 
        status: 403,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
  
  // PostgreSQL auth doesn't support anonymous users
  return NextResponse.json(
    { error: 'SERVICE_UNAVAILABLE', message: 'Anonymous authentication and merging is not supported with PostgreSQL authentication' },
    { 
      status: 501,
      headers: {
        ...getCORSHeaders(origin || undefined),
        'Cache-Control': 'no-store'
      }
    }
  );
}
