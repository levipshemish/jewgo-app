import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';
import { errorResponses, createSuccessResponse } from '@/lib';

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.BULK_OPERATIONS)) {
      return errorResponses.forbidden();
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
    const result = await AdminDatabaseService.bulkOperation({
      operation: validatedData.operation,
      delegate: prisma.restaurant,
      modelKey: 'restaurant',
      data: validatedData.data,
      user: adminUser,
      entityType: 'restaurant',
      options: {
        batchSize: 100,
        onProgress: async (processed, total) => {
          adminLogger.info('Bulk restaurant progress', { action, processed, total });
        },
      },
    });

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      ...result,
    });
  } catch (error) {
    adminLogger.error('Restaurant bulk operation error', { error: String(error) });
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error as any) },
        { status: 400 }
      );
    }

    return errorResponses.internalError();
  }
}
