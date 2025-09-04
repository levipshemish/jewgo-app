import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { errorResponses, createSuccessResponse } from '@/lib';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_VIEW)) {
      return errorResponses.forbidden();
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
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
      'google_rating',
      'google_review_count',
      'created_at',
      'updated_at',
    ];

    // Export to CSV using streaming for large datasets
    const result = await AdminDatabaseService.streamToCSV(
      prisma.restaurant,
      'restaurant',
      {
        search,
        filters,
        sortBy,
        sortOrder,
      },
      exportFields,
      10000, // Max 10k rows
      1000   // Batch size
    );

    // Log the export action
    await logAdminAction(adminUser, AUDIT_ACTIONS.DATA_EXPORT, 'restaurant', {
      metadata: {
        search,
        filters,
        totalCount: result.totalCount,
        exportedCount: result.exportedCount,
        limited: result.limited,
      },
    });

    // Return streaming CSV response
    const response = new NextResponse(result.stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="restaurants_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });

    return response;
  } catch (error) {
    adminLogger.error('Restaurant export error', { error: String(error) });
    return errorResponses.internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_VIEW)) {
      return errorResponses.forbidden();
    }

    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const search = body.search as string | undefined;
    const status = body.status as string | undefined;
    const city = body.city as string | undefined;
    const state = body.state as string | undefined;
    const sortBy = (body.sortBy as string) || 'created_at';
    const sortOrder = (body.sortOrder as 'asc' | 'desc') || 'desc';

    const filters: any = {};
    if (status) { filters.status = status; }
    if (city) { filters.city = city; }
    if (state) { filters.state = state; }

    const exportFields = [
      'id','name','address','city','state','phone_number','kosher_category','certifying_agency','status','submission_status','google_rating','google_review_count','created_at','updated_at'
    ];

    const result = await AdminDatabaseService.exportToCSV(
      prisma.restaurant,
      'restaurant',
      { search, filters, sortBy, sortOrder },
      exportFields,
      10000
    );

    await logAdminAction(adminUser, AUDIT_ACTIONS.DATA_EXPORT, 'restaurant', {
      metadata: { search, filters, totalCount: result.totalCount, exportedCount: result.exportedCount, limited: result.limited },
    });

    return new NextResponse(result.csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="restaurants_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    adminLogger.error('Restaurant export (POST) error', { error: String(error) });
    return errorResponses.internalError();
  }
}
