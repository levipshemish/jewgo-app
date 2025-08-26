import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

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

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Build filters
    const filters: any = {};
    if (status) { filters.status = status; }
    if (city) { filters.city = city; }
    if (state) { filters.state = state; }

    // Define export fields
    const exportFields = [
      'id',
      'name',
      'address',
      'city',
      'state',
      'phone_number',
      'kosher_category',
      'certifying_agency',
      'status',
      'submission_status',
      'rating',
      'review_count',
      'created_at',
      'updated_at',
    ];

    // Export to CSV
    const result = await AdminDatabaseService.exportToCSV(
      prisma.restaurant,
      'restaurant',
      {
        search,
        filters,
        sortBy,
        sortOrder,
      },
      exportFields,
      10000 // Max 10k rows
    );

    // Log the export action
    await logAdminAction(adminUser, 'restaurant_export', 'restaurant', {
      metadata: {
        search,
        filters,
        totalCount: result.totalCount,
        exportedCount: result.exportedCount,
        limited: result.limited,
      },
    });

    // Return CSV response
    const response = new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="restaurants_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    console.error('[ADMIN] Restaurant export error:', error);
    return NextResponse.json(
      { error: 'Failed to export restaurants' },
      { status: 500 }
    );
  }
}
