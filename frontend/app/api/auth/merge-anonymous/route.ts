import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  checkRateLimit,
  generateIdempotencyKey,
  checkIdempotency,
  storeIdempotencyResult
} from '@/lib/rate-limiting';
import { 
  validateTrustedIP,
  generateCorrelationId,
  scrubPII,
  extractIsAnonymous
} from '@/lib/utils/auth-utils';
import { validateCSRFServer } from '@/lib/utils/auth-utils.server';
import { verifyMergeCookieVersioned } from '@/lib/utils/auth-utils.server';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders,
  getCookieOptions 
} from '@/lib/config/environment';

export const runtime = 'nodejs';

// Table→ownerColumn map for safe migration
const TABLE_OWNER_MAP: Record<string, string> = {
  'restaurants': 'user_id',
  'reviews': 'user_id', 
  'favorites': 'user_id',
  'marketplace_items': 'seller_id',
  'user_profiles': 'user_id',
  'notifications': 'user_id'
};

/**
 * Merge anonymous API with comprehensive authorization checks
 * Handles OPTIONS/CORS preflight and POST requests for account merging
 * 
 * IMPROVED MERGE LOGIC: Prevents data loss by retaining conflicting records
 * instead of deleting them. This ensures no user data is lost during merges
 * and provides audit trails for conflict resolution.
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Validate origin against allowlist
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer, x-csrf-token',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  
  try {
    // Get request details for security validation
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const csrfToken = request.headers.get('x-csrf-token');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const reqIp = (request as any).ip || request.headers.get('cf-connecting-ip') || request.headers.get('x-vercel-ip') || 'unknown';
    
    // Comprehensive CSRF validation with signed token fallback
    if (!validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
      console.error(`CSRF validation failed for correlation ID: ${correlationId}`, {
        origin,
        referer,
        reqIp,
        correlationId,
        hasCSRFToken: !!csrfToken
      });
      
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { 
          status: 403,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Trusted IP validation with left-most X-Forwarded-For parsing
    const validatedIP = validateTrustedIP(reqIp, request.headers.get('x-forwarded-for') || undefined);
    
    // Rate limiting for merge operations
    const rateLimitResult = await checkRateLimit(
      `merge_anonymous:${validatedIP}`,
      'merge_operations',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for merge anonymous IP: ${validatedIP}`, {
        correlationId,
        remaining_attempts: rateLimitResult.remaining_attempts,
        reset_in_seconds: rateLimitResult.reset_in_seconds
      });
      
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
    
    // Create Supabase SSR client with cookie adapter
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
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
    
    if (getUserError) {
      console.error(`Failed to get user for merge anonymous correlation ID: ${correlationId}`, {
        error: getUserError,
        correlationId
      });
      
      return NextResponse.json(
        { error: 'Authentication error' },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    if (!user) {
      console.error(`No user found for merge anonymous correlation ID: ${correlationId}`, {
        correlationId
      });
      
      return NextResponse.json(
        { error: 'No authenticated user' },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Authorization check: current session user must exist and NOT be anonymous
    const currentAuthUid = user.id;
    if (extractIsAnonymous(user)) {
      console.error(`Anonymous user attempted merge for correlation ID: ${correlationId}`, {
        user_id: currentAuthUid,
        correlationId
      });
      
      return NextResponse.json(
        { error: 'Current user cannot be anonymous' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Verify HMAC cookie with current/previous key support
    const mergeToken = cookieStore.get('merge_token')?.value;
    if (!mergeToken) {
      console.error(`No merge token found for correlation ID: ${correlationId}`, {
        correlationId
      });
      
      return NextResponse.json(
        { error: 'No merge token' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    const cookieVerification = verifyMergeCookieVersioned(mergeToken);
    if (!cookieVerification.valid) {
      console.error(`Invalid merge token for correlation ID: ${correlationId}`, {
        error: cookieVerification.error,
        correlationId
      });
      
      return NextResponse.json(
        { error: 'Invalid merge token' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    const { payload: cookiePayload } = cookieVerification;
    
    // Verify cookie payload anon_uid is different from current user
    if (cookiePayload.anon_uid === currentAuthUid) {
      console.error(`Merge token UID same as current user for correlation ID: ${correlationId}`, {
        cookie_uid: cookiePayload.anon_uid,
        current_uid: currentAuthUid,
        correlationId
      });
      
      return NextResponse.json(
        { error: 'Cannot merge same user' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Use sourceUid and targetUid for migration
    const sourceUid = cookiePayload.anon_uid;
    const targetUid = currentAuthUid;
    
    // Check idempotency to prevent duplicate merges
    const idempotencyKey = generateIdempotencyKey('merge_anonymous', `${sourceUid}_${targetUid}`);
    const idempotencyCheck = await checkIdempotency(idempotencyKey); // 1 hour TTL
    
    if (idempotencyCheck.exists) {
      console.log(`Idempotent merge operation for correlation ID: ${correlationId}`, {
        source_uid: sourceUid,
        target_uid: targetUid,
        correlationId
      });
      
      return NextResponse.json(
        { 
          ok: true, 
          moved: idempotencyCheck.result?.moved || [],
          correlation_id: correlationId,
          idempotent: true
        },
        { 
          status: 202,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Create service role client for database operations
    const serviceRoleClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
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
    
    // Perform collision-safe merge using single SQL transaction
    const movedRecords: string[] = [];
    
    try {
      // Use a single RPC call to handle all table migrations atomically
      const { data: mergeResult, error: mergeError } = await serviceRoleClient.rpc('merge_anonymous_user_data', {
        source_user_id: sourceUid,
        target_user_id: targetUid
      });
      
      if (mergeError) {
        console.error(`Merge transaction failed for correlation ID: ${correlationId}`, {
          error: mergeError,
          source_uid: sourceUid,
          target_uid: targetUid,
          correlationId
        });
        
        return NextResponse.json(
          { 
            error: 'Merge operation failed',
            correlation_id: correlationId
          },
          { 
            status: 500,
            headers: getCORSHeaders(origin || undefined)
          }
        );
      }
      
      // Extract results from the transaction
      if (mergeResult && Array.isArray(mergeResult)) {
        movedRecords.push(...mergeResult);
      }
      
    } catch (transactionError) {
      console.error(`Merge transaction error for correlation ID: ${correlationId}`, {
        error: transactionError,
        source_uid: sourceUid,
        target_uid: targetUid,
        correlationId
      });
      
      return NextResponse.json(
        { 
          error: 'Merge operation failed',
          correlation_id: correlationId
        },
        { 
          status: 500,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Store idempotency result
    await storeIdempotencyResult(idempotencyKey, { moved: movedRecords }, 3600);
    
    // Clear merge token cookie
    const cookieOptions = getCookieOptions();
    const response = NextResponse.json(
      { 
        ok: true, 
        moved: movedRecords,
        correlation_id: correlationId
      },
      { 
        status: 202,
        headers: getCORSHeaders(origin || undefined)
      }
    );
    
    response.cookies.set('merge_token', '', {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      domain: cookieOptions.domain,
      maxAge: 0,
      path: '/'
    });
    
    // Log successful merge operation
    console.log(`Merge anonymous successful for correlation ID: ${correlationId}`, {
      source_uid: sourceUid,
      target_uid: targetUid,
      moved_records: movedRecords,
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return response;
    
  } catch (error) {
    console.error(`Unexpected error in merge anonymous for correlation ID: ${correlationId}`, {
      error: scrubPII(error),
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        correlation_id: correlationId
      },
      { 
        status: 500,
        headers: getCORSHeaders(request.headers.get('origin') || undefined)
      }
    );
  }
}
