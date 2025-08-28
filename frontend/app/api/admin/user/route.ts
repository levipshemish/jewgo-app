import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return current admin user data
    return NextResponse.json({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      adminRole: adminUser.adminRole,
      permissions: adminUser.permissions,
      isSuperAdmin: adminUser.isSuperAdmin,
      createdAt: adminUser.createdAt,
      lastLogin: adminUser.lastLogin
    });
  } catch (error) {
    console.error('[ADMIN] Get current user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
