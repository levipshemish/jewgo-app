import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { generateSignedCSRFToken } from '@/lib/admin/csrf';
import { corsHeaders } from '@/lib/middleware/security';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(RATE_LIMITS.DEFAULT)(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate signed CSRF token
    const token = generateSignedCSRFToken(adminUser.id);

    // Return token with no-cache headers
    return NextResponse.json(
      { token },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[ADMIN] CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
