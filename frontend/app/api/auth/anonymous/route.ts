import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  generateCorrelationId,
  scrubPII,
  extractIsAnonymous
} from '@/lib/utils/auth-utils';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders,
  FEATURE_FLAGS
} from '@/lib/config/environment';

/**
 * Node.js runtime version - more reliable for complex operations
 * This version uses Node.js runtime for better compatibility
 */
export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: {
      ...getCORSHeaders(origin || undefined),
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  const origin = request.headers.get('origin');
  
  // Kill switch check for anonymous auth feature flag
  if (!FEATURE_FLAGS.ANONYMOUS_AUTH) {
    return NextResponse.json(
      { error: 'ANON_SIGNIN_UNSUPPORTED' },
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
    // Parse request body
    const body = await request.json().catch(() => ({}));
    
    // Create Supabase client with cookies
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
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );
    
    // Check for existing anonymous session
    const { data: { user: existingUser }, error: getUserError } = await supabase.auth.getUser();
    
    if (!getUserError && existingUser && extractIsAnonymous(existingUser)) {
      return NextResponse.json(
        { 
          ok: true, 
          user_id: existingUser.id,
          message: 'Anonymous session already exists'
        },
        { 
          status: 200,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Create anonymous user
    const { data, error: signInError } = await supabase.auth.signInAnonymously();
    
    if (signInError) {
      console.error(`Anonymous signin failed for correlation ID: ${correlationId}`, {
        error: signInError,
        correlationId
      });
      
      return NextResponse.json(
        { 
          error: 'ANON_SIGNIN_FAILED',
          details: signInError.message,
          correlation_id: correlationId
        },
        { 
          status: 500,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Get the session to set cookies
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = NextResponse.json(
      { 
        ok: true, 
        user_id: data.user?.id,
        message: 'Anonymous signin successful'
      },
      { 
        status: 200,
        headers: {
          ...getCORSHeaders(origin || undefined),
          'Cache-Control': 'no-store'
        }
      }
    );
    
    // Set auth cookies
    if (session) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };
      
      // Set the auth cookies
      response.cookies.set('sb-access-token', session.access_token, cookieOptions);
      response.cookies.set('sb-refresh-token', session.refresh_token, cookieOptions);
    }
    
    return response;
    
  } catch (error) {
    console.error(`Unexpected error in anonymous auth for correlation ID: ${correlationId}`, {
      error: scrubPII(error),
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        error: 'ANON_SIGNIN_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        correlation_id: correlationId
      },
      { 
        status: 500,
        headers: {
          ...getCORSHeaders(origin || undefined),
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
