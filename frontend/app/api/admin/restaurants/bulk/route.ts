import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.BULK_OPERATIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action, ids, data } = body;

    // Validate bulk operation
    const validatedData = validationUtils.validateBulkOperation({
      operation: action,
      entityType: 'restaurant',
      data: data || ids,
    });

    // Log the action
    await logAdminAction(adminUser, `restaurant_bulk_${action}`, 'restaurant', {
      metadata: { action, count: ids?.length || data?.length || 0 },
    });

    // Perform bulk operation
    const result = await AdminDatabaseService.bulkOperation(
      validatedData.operation,
      prisma.restaurant,
      'restaurant',
      validatedData.data,
      adminUser,
      'restaurant',
      {
        batchSize: 100,
        onProgress: async (processed, total) => {
          console.log(`[BULK] Restaurant ${action}: ${processed}/${total}`);
        },
      }
    );

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      ...result,
    });
  } catch (error) {
    console.error('[ADMIN] Restaurant bulk operation error:', error);
    
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
