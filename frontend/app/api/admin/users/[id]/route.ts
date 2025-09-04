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
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_DELETE)) {
      return errorResponses.forbidden();
    }
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }
    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) {
      return errorResponses.badRequest();
    }
    await AdminDatabaseService.deleteRecord(
      prisma.user,
      'user',
      id,
      adminUser,
      'user',
      true
    );
    return createSuccessResponse({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] User delete error:', error);
    return errorResponses.internalError();
  }
}
