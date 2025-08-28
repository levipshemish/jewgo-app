import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { generateSignedCSRFToken } from '@/lib/admin/csrf';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { AdminErrors } from '@/lib/admin/errors';
import { corsHeaders } from '@/lib/middleware/security';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return AdminErrors.UNAUTHORIZED();
    }

    // Generate signed CSRF token
    const token = generateSignedCSRFToken(adminUser.id);

    return NextResponse.json({ 
      token,
      expiresIn: 3600000, // 1 hour in milliseconds
    });

  } catch (error) {
    console.error('[ADMIN] CSRF token generation error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to generate CSRF token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
