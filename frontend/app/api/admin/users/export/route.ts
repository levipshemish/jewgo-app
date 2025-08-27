import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_VIEW) ||
        !hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
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
    const sortBy = searchParams.get('sortBy') || 'createdat';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Reject unknown filters/params that could break Prisma
    const allowedParams = new Set(['search', 'sortBy', 'sortOrder']);
    const unknownParams: string[] = [];
    for (const key of Array.from(searchParams.keys())) { if (!allowedParams.has(key)) unknownParams.push(key); }
    if (unknownParams.length) {
      return NextResponse.json({ error: `Unsupported filters: ${unknownParams.join(', ')}` }, { status: 400 });
    }

    // Build filters (none currently supported)
    const filters: any = {};

    // Define export fields
    const exportFields = [
      'id',
      'email',
      'name',
      'issuperadmin',
      'createdat',
      'updatedat',
    ];

    // Export to CSV
    const result = await AdminDatabaseService.exportToCSV(
      prisma.user,
      'user',
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
    await logAdminAction(adminUser, AUDIT_ACTIONS.DATA_EXPORT, 'user', {
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
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    console.error('[ADMIN] User export error:', error);
    return NextResponse.json(
      { error: 'Failed to export users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_VIEW) ||
        !hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    const body = await request.json().catch(() => ({}));
    const search = body.search as string | undefined;
    const sortBy = (body.sortBy as string) || 'createdat';
    const sortOrder = (body.sortOrder as 'asc' | 'desc') || 'desc';

    // Validate that no unsupported filters are passed
    const allowedBodyKeys = new Set(['search', 'sortBy', 'sortOrder', 'format', 'fields']);
    const unknownBodyKeys = Object.keys(body || {}).filter(k => !allowedBodyKeys.has(k));
    if (unknownBodyKeys.length) {
      return NextResponse.json({ error: `Unsupported filters: ${unknownBodyKeys.join(', ')}` }, { status: 400 });
    }

    const filters: any = {};

    const exportFields = [
      'id','email','name','issuperadmin','createdat','updatedat'
    ];

    const result = await AdminDatabaseService.exportToCSV(
      prisma.user,
      'user',
      { search, filters, sortBy, sortOrder },
      exportFields,
      10000
    );

    await logAdminAction(adminUser, AUDIT_ACTIONS.DATA_EXPORT, 'user', {
      metadata: { search, filters, totalCount: result.totalCount, exportedCount: result.exportedCount, limited: result.limited },
    });

    return new NextResponse(result.csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[ADMIN] User export (POST) error:', error);
    return NextResponse.json({ error: 'Failed to export users' }, { status: 500 });
  }
}
