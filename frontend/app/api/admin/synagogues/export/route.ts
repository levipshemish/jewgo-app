import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
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

    if (!adminUser.permissions.includes('DATA_EXPORT')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { search, filters } = body;

    const validatedData = validationUtils.validateExport({
      search,
      filters,
    });

    await logAdminAction(adminUser, 'synagogue_export', 'florida_synagogue', {
      metadata: { search, filters },
    });

    const csvData = await AdminDatabaseService.exportToCSV(
      prisma.floridaSynagogue,
      'floridaSynagogue',
      {
        search: validatedData.search,
        filters: validatedData.filters,
      }
    );

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="florida_synagogues_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Synagogue export error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export synagogues' },
      { status: 500 }
    );
  }
}
