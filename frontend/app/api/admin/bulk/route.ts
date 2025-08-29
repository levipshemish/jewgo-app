import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logBulkOperation, logBulkProgress } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for bulk operations
    const rateLimitResult = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

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
        return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
      }
    } catch (error) {
    adminLogger.error('CSRF token validation error', { error: String(error) });
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
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
      marketplace: prisma.marketplace,
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
      modelKey: validatedData.entityType as 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace',
      data: validatedData.data,
      user: adminUser,
      entityType: validatedData.entityType,
      correlationId,
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
    adminLogger.error('Bulk operation error', { error: String(error) });
    
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

    // Read progress from audit logs metadata as a lightweight status store
    const log = await prisma.auditLog.findFirst({
      where: { correlationId },
      orderBy: { timestamp: 'desc' },
      select: { metadata: true, action: true, entityType: true, timestamp: true },
    });

    if (!log) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let meta: any = {};
    try { meta = log.metadata ? JSON.parse(log.metadata as any) : {}; } catch {}
    const progress = typeof meta.progress === 'number' ? meta.progress : undefined;
    const processedItems = typeof meta.processedItems === 'number' ? meta.processedItems : undefined;
    const totalItems = typeof meta.totalItems === 'number' ? meta.totalItems : undefined;
    const errors: string[] = Array.isArray(meta.errors) ? meta.errors : [];

    return NextResponse.json({
      correlationId,
      action: log.action,
      entityType: log.entityType,
      timestamp: log.timestamp,
      progress,
      processedItems,
      totalItems,
      errors,
    });
  } catch (error) {
    adminLogger.error('Bulk operation status error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get bulk operation status' },
      { status: 500 }
    );
  }
}
