import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { AdminDatabaseService } from '@/lib/admin/database';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test database connection first
    try {
      await prisma.$connect();
      console.log('[ADMIN] Database connection successful');
    } catch (dbError) {
      console.error('[ADMIN] Database connection failed:', dbError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
      }, { status: 503 });
    }

    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Moderators and above can view submissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'submission_date';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const status = searchParams.get('status') || undefined; // pending_approval|approved|rejected|all

    // Only moderation-related fields matter for this list
    const filters: any = {};
    if (status && status !== 'all') {
      filters.submission_status = status;
    }

    console.log('[ADMIN] Fetching submissions with filters:', { page, pageSize, search, sortBy, sortOrder, status });

    // Get submissions
    console.log('[ADMIN SUBMISSIONS] Getting submissions from database...');
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.restaurant,
      'restaurant',
      {
        page,
        pageSize,
        search: undefined,
        filters: { submission_status: status },
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      }
    );

    console.log('[ADMIN SUBMISSIONS] Successfully retrieved submissions:', result.data.length);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ADMIN] Submissions restaurants error:', error);
    
    // Provide more detailed error information in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to fetch submissions: ${error instanceof Error ? error.message : String(error)}`
      : 'Failed to fetch submissions';
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  } finally {
    // Always disconnect from database
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('[ADMIN] Error disconnecting from database:', disconnectError);
    }
  }
}

