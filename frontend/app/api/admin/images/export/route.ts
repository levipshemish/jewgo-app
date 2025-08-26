import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { search, filters } = body;

    const validatedData = validationUtils.validateExport({
      search,
      filters,
    });

    await logAdminAction(adminUser, 'image_export', 'restaurant_image', {
      metadata: { search, filters },
    });

    const csvResult = await AdminDatabaseService.exportToCSV(
      prisma.restaurantImage,
      'restaurantImage',
      {
        search: validatedData.search,
        filters: validatedData.filters,
      }
    );

    return new NextResponse(csvResult.csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="restaurant_images_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Image export error:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error as any) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export images' },
      { status: 500 }
    );
  }
}
