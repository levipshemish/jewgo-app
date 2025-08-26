import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { search, filters } = body;

    // Validate export request
    const validatedData = validationUtils.validateExport({
      search,
      filters,
    });

    // Log the action
    await logAdminAction(adminUser, 'restaurant_export', 'restaurant', {
      metadata: { search, filters },
    });

    // Export data to CSV
    const csvResult = await AdminDatabaseService.exportToCSV(
      prisma.restaurant,
      'restaurant',
      {
        search: validatedData.search,
        filters: validatedData.filters,
      }
    );

    // Return CSV response
    return new NextResponse(csvResult.csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="restaurants_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Restaurant export error:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error as any) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export restaurants' },
      { status: 500 }
    );
  }
}
