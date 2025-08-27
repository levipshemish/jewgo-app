import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const status = searchParams.get('status') || 'pending_approval';

    // Build filters for submissions
    const filters: any = { submission_status: status };

    adminLogger.info('Fetching restaurant submissions with filters', { page, pageSize, search, sortBy, sortOrder, status });

    // Get paginated data for submissions
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.restaurant,
      'restaurant',
      {
        page,
        pageSize,
        search,
        filters,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      }
    );

    adminLogger.info('Successfully fetched restaurant submissions', { count: result.data.length, total: result.pagination.total });

    // Log the action
    await logAdminAction(adminUser, 'restaurant_submissions_view', 'restaurant', {
      metadata: { page, pageSize, search, filters },
    });

    return NextResponse.json(result);
  } catch (error) {
    adminLogger.error('Restaurant submissions list error', { error: String(error) });
    
    // Provide more detailed error information in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to fetch restaurant submissions: ${error instanceof Error ? error.message : String(error)}`
      : 'Failed to fetch restaurant submissions';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
