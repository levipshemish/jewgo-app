import { _NextRequest, _NextResponse} from 'next/server';
import { _createServerClient} from '@supabase/ssr';
import { _createClient} from '@supabase/supabase-js';
import { _cookies} from 'next/headers';
import { 
  _checkRateLimit} from '@/lib/rate-limiting';
import { 
  _validateTrustedIP, _generateCorrelationId, _extractIsAnonymous} from '@/lib/utils/auth-utils';
import { 
  _verifyMergeCookieVersioned, _hashIPForPrivacy, _validateCSRFServer} from '@/lib/utils/auth-utils.server';
import { 
  _ALLOWED_ORIGINS, _getCORSHeaders, _FEATURE_FLAGS} from '@/lib/config/environment';
import { _initializeServer} from '@/lib/server-init';

export const _runtime = 'nodejs';

/**
 * Merge anonymous user API with versioned HMAC cookie verification
 * Handles OPTIONS/CORS preflight and POST requests for user merging
 */
export async function OPTIONS(request: NextRequest) {
  const _origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin || undefined)
  });
}

export async function POST(request: NextRequest) {
  const _correlationId = generateCorrelationId();
  // const _startTime = Date.now();
  
  // Initialize server-side functionality
  const _serverInitialized = await initializeServer();
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
  const _origin = request.headers.get('origin');
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
  
  // Kill switch check for anonymous auth feature flag
  if (!FEATURE_FLAGS.ANONYMOUS_AUTH) {
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE' },
      { 
        status: 503,
        headers: {
          ...getCORSHeaders(origin || undefined),
          'Cache-Control': 'no-store'
        }
      }
    );
  }
  
  try {
    // Get request details for security validation
    const _referer = request.headers.get('referer');
    const _csrfToken = request.headers.get('x-csrf-token');
    const _forwardedFor = request.headers.get('x-forwarded-for');
    const _realIP = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    
    // Trusted IP validation with left-most X-Forwarded-For parsing
    const _validatedIP = validateTrustedIP(realIP, forwardedFor || undefined);
    const _ipHash = hashIPForPrivacy(validatedIP);
    
    // Comprehensive CSRF validation with signed token fallback
    if (!validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
      console.error(`CSRF validation failed for correlation ID: ${correlationId}`, {
        origin,
        referer,
        ipHash,
        correlationId,
        hasCSRFToken: !!csrfToken
      });
      
      return NextResponse.json(
        { error: 'CSRF' },
        { 
          status: 403,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Rate limiting for merge operations
    const _rateLimitResult = await checkRateLimit(
      `merge_anonymous:${ipHash}`,
      'merge_operations',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      // Rate limit exceeded - log for monitoring but don't expose details
      // console.warn(`Rate limit exceeded for merge anonymous IP hash: ${ipHash}`, {
      //   correlationId,
      //   remaining_attempts: rateLimitResult.remaining_attempts,
      //   reset_in_seconds: rateLimitResult.reset_in_seconds
      // });
      
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          remaining_attempts: rateLimitResult.remaining_attempts,
          reset_in_seconds: rateLimitResult.reset_in_seconds,
          retry_after: rateLimitResult.retry_after,
          correlation_id: correlationId
        },
        { 
          status: 429,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Parse request body (email/password not required for merge)
    // const _body = await request.json().catch(() => ({}));
    
    // Get merge token from cookies
    const _cookieStore = await cookies();
    const _mergeToken = cookieStore.get('merge_token')?.value;
    
    if (!mergeToken) {
      return NextResponse.json(
        { error: 'NO_MERGE_TOKEN' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Verify merge token
    const _tokenVerification = verifyMergeCookieVersioned(mergeToken);
    if (!tokenVerification.valid) {
      // Invalid merge token - log for security monitoring
      // console.error(`Invalid merge token for correlation ID: ${correlationId}`, {
      //   error: tokenVerification.error,
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'INVALID_MERGE_TOKEN' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    const { anon_uid } = tokenVerification.payload;
    
    // Create Supabase SSR client
    const _supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(_name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );
    
    // Get current user session
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError || !user) {
      return NextResponse.json(
        { error: 'AUTHENTICATION_ERROR' },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Verify user is NON-anonymous (current user must be authenticated)
    if (extractIsAnonymous(user)) {
      // Anonymous user attempted merge - log for security monitoring
      // console.error(`Anonymous user attempted merge for correlation ID: ${correlationId}`, {
      //   user_id: user.id,
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'USER_NOT_ANONYMOUS' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Verify the anonymous user ID from token matches the expected anon_uid
    if (user.id === anon_uid) {
      // Self-merge attempt - log for security monitoring
      // console.error(`Current user ID matches anon_uid for correlation ID: ${correlationId}`, {
      //   user_id: user.id,
      //   anon_uid,
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'INVALID_MERGE_REQUEST' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Create service role client for database operations
    const _supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Check for existing merge job to ensure idempotency
    const { data: existingJob } = await supabaseService
      .from('merge_jobs')
      .select('*')
      .eq('correlation_id', correlationId)
      .single();
    
    if (existingJob) {

      const _response = NextResponse.json(
        { 
          ok: true,
          moved: existingJob.moved_data || {},
          correlation_id: correlationId,
          message: 'Merge already completed'
        },
        { 
          status: 202,
          headers: getCORSHeaders(origin || undefined)
        }
      );
      
      // Clear merge token
      response.cookies.set('merge_token', '', {
        maxAge: 0,
        path: '/'
      });
      
      return response;
    }
    
    // Perform the merge operation in a transaction
    const { data: movedData, error: mergeError } = await supabaseService.rpc('merge_anonymous_user_data', {
      p_anon_uid: anon_uid,
      p_auth_uid: user.id,
      p_correlation_id: correlationId
    });
    
    if (mergeError) {
      // Merge operation failed - log for debugging
      // console.error(`Merge operation failed for correlation ID: ${correlationId}`, {
      //   error: mergeError,
      //   anon_uid,
      //   auth_uid: user.id,
      //   correlationId
      // });
      
      return NextResponse.json(
        { 
          error: 'MERGE_FAILED',
          details: mergeError.message,
          correlation_id: correlationId
        },
        { 
          status: 500,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Record the merge job for idempotency
    const { error: jobError } = await supabaseService
      .from('merge_jobs')
      .insert({
        correlation_id: correlationId,
        anon_uid,
        auth_uid: user.id,
        moved_data: movedData,
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    
    if (jobError) {
      // Failed to record merge job - log for monitoring
      // console.error(`Failed to record merge job for correlation ID: ${correlationId}`, {
      //   error: jobError,
      //   correlationId
      // });
      // Don't fail the request, just log the error
    }
    
    // Merge operation successful - log for monitoring
    // console.log(`Merge operation successful for correlation ID: ${correlationId}`, {
    //   anon_uid,
    //   auth_uid: user.id,
    //   moved_data: movedData,
    //   correlationId,
    //   duration_ms: Date.now() - startTime
    // });
    
    // Clear merge token and return success
    const _response = NextResponse.json(
      { 
        ok: true,
        moved: movedData,
        correlation_id: correlationId,
        message: 'Merge completed successfully'
      },
      { 
        status: 202,
        headers: getCORSHeaders(origin || undefined)
      }
    );
    
    response.cookies.set('merge_token', '', {
      maxAge: 0,
      path: '/'
    });
    
    return response;
    
  } catch (_error) {
    // Unexpected error - log for debugging
    // console.error(`Unexpected error in merge anonymous for correlation ID: ${correlationId}`, {
    //   error: scrubPII(_error),
    //   correlationId,
    //   duration_ms: Date.now() - startTime
    // });
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        correlation_id: correlationId
      },
      { 
        status: 500,
        headers: getCORSHeaders(origin || undefined)
      }
    );
  }
}
