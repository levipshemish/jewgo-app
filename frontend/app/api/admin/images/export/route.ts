import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.IMAGE_VIEW) ||
        !hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const restaurantId = searchParams.get('restaurantId') ? parseInt(searchParams.get('restaurantId')!) : undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Build filters
    const filters: any = {};
    if (restaurantId) { filters.restaurant_id = restaurantId; }

    // Define export fields
    const exportFields = [
      'id',
      'restaurant_id',
      'image_url',
      'cloudinary_public_id',
      'image_order',
      'created_at',
      'updated_at',
    ];

    // Export to CSV
    const result = await AdminDatabaseService.exportToCSV(
      prisma.restaurantImage,
      'restaurantImage',
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
    await logAdminAction(adminUser, AUDIT_ACTIONS.DATA_EXPORT, 'restaurant_image', {
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
        'Content-Disposition': `attachment; filename="images_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    adminLogger.error('Image export error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to export images' },
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

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.IMAGE_VIEW) ||
        !hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const search = body.search as string | undefined;
    const restaurantId = body.restaurantId ? parseInt(body.restaurantId) : undefined;
    const sortBy = (body.sortBy as string) || 'created_at';
    const sortOrder = (body.sortOrder as 'asc' | 'desc') || 'desc';

    const filters: any = {};
    if (restaurantId) { filters.restaurant_id = restaurantId; }

    const exportFields = [
      'id','restaurant_id','image_url','cloudinary_public_id','image_order','created_at','updated_at'
    ];

    const result = await AdminDatabaseService.exportToCSV(
      prisma.restaurantImage,
      'restaurantImage',
      { search, filters, sortBy, sortOrder },
      exportFields,
      10000
    );

    await logAdminAction(adminUser, AUDIT_ACTIONS.DATA_EXPORT, 'restaurant_image', {
      metadata: { search, filters, totalCount: result.totalCount, exportedCount: result.exportedCount, limited: result.limited },
    });

    return new NextResponse(result.csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="images_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    adminLogger.error('Image export (POST) error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to export images' }, { status: 500 });
  }
}
