import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { corsHeaders } from '@/lib/middleware/security';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return the admin user profile
    return NextResponse.json({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      adminRole: adminUser.adminRole,
      isSuperAdmin: adminUser.isSuperAdmin,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt,
    });
  } catch (error) {
    console.error('[ADMIN] User profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
