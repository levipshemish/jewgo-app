import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { prisma } from '@/lib/db/prisma';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.IMAGE_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }
    const { params } = await context;
    const { id } = await params;
    const imageId = Number(id);
    if (!Number.isInteger(imageId)) {
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
    }
    await AdminDatabaseService.deleteRecord(
      prisma.restaurantImage,
      'restaurantImage',
      imageId,
      adminUser,
      'restaurant_image',
      true
    );
    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] Image delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
