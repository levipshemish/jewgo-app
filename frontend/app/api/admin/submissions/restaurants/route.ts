import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { AdminDatabaseService } from '@/lib/admin/database';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
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

    const result = await AdminDatabaseService.getPaginatedData(
      prisma.restaurant,
      'restaurant',
      {
        page,
        pageSize,
        search,
        filters,
        sortBy,
        sortOrder,
      },
      // Include minimal relationships if needed; return raw fields otherwise
      undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ADMIN] Submissions restaurants error:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

