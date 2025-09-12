import { NextRequest, NextResponse } from 'next/server';
// PostgreSQL auth - using backend API instead of Supabase
// import { cookies } from 'next/headers'; // TODO: Implement cookie handling
import { 
  checkRateLimit
} from '@/lib/rate-limiting';
import { 
  generateCorrelationId,
  // scrubPII // TODO: Implement PII scrubbing
} from '@/lib/utils/auth-utils';
// import { errorResponses } from '@/lib'; // TODO: Implement error responses
// import { createSuccessResponse } from '@/lib'; // TODO: Implement success response

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const _correlationId = generateCorrelationId(); // TODO: Use correlation ID
  
  try {
    // Check rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const rateLimitResult = await checkRateLimit('upgrade-email', 'email_auth', ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded' 
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and password are required' 
        },
        { status: 400 }
      );
    }

    // Redirect with 307 to backend upgrade-email endpoint to upgrade guest → email
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    const redirect = NextResponse.redirect(`${backendUrl}/api/auth/upgrade-email`, 307);
    return redirect;

  } catch (error) {
    console.error('[Auth] Email upgrade error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
