import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { errorResponses, createSuccessResponse } from '@/lib';

// CORS headers helper
const corsHeaders = (request: NextRequest) => {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
  };
};

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.DEFAULT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }

    return createSuccessResponse(adminUser);

  } catch (error) {
    console.error('[ADMIN] Get admin user error:', error);
    return errorResponses.internalError(`Failed to get admin user: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
