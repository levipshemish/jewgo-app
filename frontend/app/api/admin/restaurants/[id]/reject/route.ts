import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { params } = await context;
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_REJECT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }
    const { id } = await params;
    const restaurantId = Number(id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }
    await AdminDatabaseService.updateRecord(
      prisma.restaurant,
      'restaurant',
      id,
      { status: 'rejected' },
      adminUser,
      'restaurant'
    );
    return NextResponse.json({ message: 'Restaurant rejected successfully' });
  } catch (error) {
    console.error('[ADMIN] Restaurant reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject restaurant' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
