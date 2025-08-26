import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.BULK_OPERATIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ids, data } = body;

    const validatedData = validationUtils.validateBulkOperation({
      operation: action,
      entityType: 'restaurantImage',
      data: data || ids,
    });

    await logAdminAction(adminUser, `image_bulk_${action}`, 'restaurant_image', {
      metadata: { action, count: ids?.length || data?.length || 0 },
    });

    const result = await AdminDatabaseService.bulkOperation({
      operation: validatedData.operation,
      delegate: prisma.restaurantImage,
      modelKey: 'restaurantImage',
      data: validatedData.data,
      user: adminUser,
      entityType: 'restaurantImage',
      options: {
        batchSize: 100,
        onProgress: async (processed, total) => {
          console.log(`[BULK] Image ${action}: ${processed}/${total}`);
        },
      },
    });

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      ...result,
    });
  } catch (error) {
    console.error('[ADMIN] Image bulk operation error:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error as any) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
