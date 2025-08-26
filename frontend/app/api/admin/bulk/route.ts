import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { getCSRFTokenFromCookie, validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logBulkOperation, logBulkProgress } from '@/lib/admin/audit';
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

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    
    try {
      // Validate header token to ensure CSRF protection
      if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
        return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
      }
    } catch (error) {
      console.error('[ADMIN] CSRF token validation error:', error);
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 419 });
    }

    // Parse request body
    const body = await request.json();
    const { operation, entityType, data, batchSize = 100 } = body;

    // Validate bulk operation
    const validatedData = validationUtils.validateBulkOperation({
      operation,
      entityType,
      data,
      batchSize,
    });

    // Get the appropriate model based on entity type
    const modelMap: Record<string, any> = {
      restaurant: prisma.restaurant,
      review: prisma.review,
      user: prisma.user,
      restaurantImage: prisma.restaurantImage,
    };

    const model = modelMap[validatedData.entityType];
    if (!model) {
      return NextResponse.json(
        { error: `Unsupported entity type: ${validatedData.entityType}` },
        { status: 400 }
      );
    }

    // Log bulk operation start
    const correlationId = await logBulkOperation(
      adminUser,
      validatedData.operation,
      validatedData.entityType,
      validatedData.data.length
    );

    // Perform bulk operation
    const result = await AdminDatabaseService.bulkOperation({
      operation: validatedData.operation,
      delegate: model,
      modelKey: validatedData.entityType as 'restaurant' | 'review' | 'user' | 'restaurantImage',
      data: validatedData.data,
      user: adminUser,
      entityType: validatedData.entityType,
      options: {
        batchSize: validatedData.batchSize,
        onProgress: async (processed, total) => {
          await logBulkProgress(correlationId, processed, total);
        },
      },
    });

    return NextResponse.json({
      message: 'Bulk operation completed',
      correlationId,
      ...result,
    });
  } catch (error) {
    console.error('[ADMIN] Bulk operation error:', error);
    
    if ((error as any).name === 'ZodError') {
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

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const correlationId = searchParams.get('correlationId');

    if (!correlationId) {
      return NextResponse.json(
        { error: 'Correlation ID is required' },
        { status: 400 }
      );
    }

    // Not implemented: hook into background job status store.
    // TODO: Implement bulk_jobs table and read progress by correlationId.
    return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
  } catch (error) {
    console.error('[ADMIN] Bulk operation status error:', error);
    return NextResponse.json(
      { error: 'Failed to get bulk operation status' },
      { status: 500 }
    );
  }
}
