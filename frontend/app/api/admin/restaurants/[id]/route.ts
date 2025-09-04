import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { prisma } from '@/lib/db/prisma';
import { errorResponses, createSuccessResponse } from '@/lib';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_DELETE)) {
      return errorResponses.forbidden();
    }
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }
    const id = Number(resolvedParams.id);
    if (!Number.isInteger(id)) {
      return errorResponses.badRequest();
    }
    await AdminDatabaseService.deleteRecord(
      prisma.restaurant,
      'restaurant',
      id,
      adminUser,
      'restaurant',
      true
    );
    return createSuccessResponse({ message: 'Restaurant updated successfully' });
  } catch (error) {
    console.error('[ADMIN] Restaurant delete error:', error);
    return errorResponses.internalError();
  }
}
