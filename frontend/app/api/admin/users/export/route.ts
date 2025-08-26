import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_VIEW)) {
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
    const provider = searchParams.get('provider') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdat';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Build filters
    const filters: any = {};
    if (provider) { filters.provider = provider; }

    // Define export fields
    const exportFields = [
      'id',
      'email',
      'name',
      'provider',
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
    await logAdminAction(adminUser, 'user_export', 'user', {
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
