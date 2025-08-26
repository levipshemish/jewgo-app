import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminUser.permissions.includes('BULK_OPERATIONS')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ids, data } = body;

    const validatedData = validationUtils.validateBulkOperation({
      operation: action,
      entityType: 'kosherPlace',
      data: data || ids,
    });

    await logAdminAction(adminUser, `kosher_place_bulk_${action}`, 'kosher_place', {
      metadata: { action, count: ids?.length || data?.length || 0 },
    });

    const result = await AdminDatabaseService.bulkOperation(
      validatedData.operation,
      prisma.kosherPlace,
      validatedData.data,
      adminUser,
      'kosherPlace',
      {
        batchSize: 100,
        onProgress: async (processed, total) => {
          console.log(`[BULK] Kosher place ${action}: ${processed}/${total}`);
        },
      }
    );

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      ...result,
    });
  } catch (error) {
    console.error('[ADMIN] Kosher place bulk operation error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
