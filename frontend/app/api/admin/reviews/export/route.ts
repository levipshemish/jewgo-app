import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
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
    if (!adminUser.permissions.includes('DATA_EXPORT')) {
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
    await logAdminAction(adminUser, 'review_export', 'review', {
      metadata: { search, filters },
    });

    // Export data to CSV
    const csvData = await AdminDatabaseService.exportToCSV(
      prisma.review,
      'review',
      {
        search: validatedData.search,
        filters: validatedData.filters,
      }
    );

    // Return CSV response
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="reviews_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Review export error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export reviews' },
      { status: 500 }
    );
  }
}
