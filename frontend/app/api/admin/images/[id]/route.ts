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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.IMAGE_DELETE)) {
      return errorResponses.forbidden();
    }
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }
    const { params } = await context;
    const { id } = await params;
    const imageId = Number(id);
    if (!Number.isInteger(imageId)) {
      return errorResponses.badRequest();
    }
    await AdminDatabaseService.deleteRecord(
      prisma.restaurantImage,
      'restaurantImage',
      imageId,
      adminUser,
      'restaurant_image',
      true
    );
    return createSuccessResponse({ message: 'Image updated successfully' });
  } catch (error) {
    console.error('[ADMIN] Image delete error:', error);
    return errorResponses.internalError();
  }
}
