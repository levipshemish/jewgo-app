import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logBulkOperation, logBulkProgress } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const model = modelMap[entityType];
    if (!model) {
      return NextResponse.json(
        { error: `Unsupported entity type: ${entityType}` },
        { status: 400 }
      );
    }

    // Log bulk operation start
    const correlationId = await logBulkOperation(
      adminUser,
      operation,
      entityType,
      data.length
    );

    // Perform bulk operation
    const result = await AdminDatabaseService.bulkOperation(
      operation,
      model,
      entityType,
      data,
      adminUser,
      entityType,
      {
        batchSize,
        onProgress: async (processed, total) => {
          await logBulkProgress(correlationId, processed, total);
        },
      }
    );

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

    // Get bulk operation status
    // This would typically query a job queue or status table
    // For now, return a mock response
    return NextResponse.json({
      correlationId,
      status: 'completed',
      progress: 100,
      success: 0,
      failed: 0,
      errors: [],
    });
  } catch (error) {
    console.error('[ADMIN] Bulk operation status error:', error);
    return NextResponse.json(
      { error: 'Failed to get bulk operation status' },
      { status: 500 }
    );
  }
}
