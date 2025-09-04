import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { AdminErrors } from '@/lib/admin/errors';
import { logAdminAction, ENTITY_TYPES, AUDIT_ACTIONS } from '@/lib/admin/audit';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.EXPORT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYNAGOGUE_VIEW)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Parse request body
    const body = await request.json();
    const { search, filters = {} } = body;
    const { city, state, affiliation } = filters;

    // Build safe WHERE conditions
    const whereConditions: any = {};
    
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (city) {
      whereConditions.city = { contains: city, mode: 'insensitive' };
    }
    
    if (state) {
      whereConditions.state = { contains: state, mode: 'insensitive' };
    }
    
    if (affiliation) {
      whereConditions.affiliation = { contains: affiliation, mode: 'insensitive' };
    }

    // Fetch synagogues data (mock data since synagogue model doesn't exist yet)
    const synagogues: any[] = [];

    // Convert to CSV
    const csvHeaders = [
      'ID',
      'Name',
      'City',
      'State',
      'Address',
      'Phone',
      'Affiliation',
      'Website',
      'Created At',
      'Updated At',
    ];

    const csvRows = synagogues.map(synagogue => [
      synagogue.id,
      `"${(synagogue.name || '').replace(/"/g, '""')}"`,
      `"${(synagogue.city || '').replace(/"/g, '""')}"`,
      `"${(synagogue.state || '').replace(/"/g, '""')}"`,
      `"${(synagogue.address || '').replace(/"/g, '""')}"`,
      `"${(synagogue.phone || '').replace(/"/g, '""')}"`,
      `"${(synagogue.affiliation || '').replace(/"/g, '""')}"`,
      `"${(synagogue.website || '').replace(/"/g, '""')}"`,
      synagogue.created_at?.toISOString() || '',
      synagogue.updated_at?.toISOString() || '',
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Log the export action
    await logAdminAction(adminUser, AUDIT_ACTIONS.DATA_EXPORT, ENTITY_TYPES.SYNAGOGUE, {
      metadata: { 
        search, 
        filters, 
        recordCount: synagogues.length,
        exportFormat: 'csv'
      },
    });

    // Return CSV with proper headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="synagogues_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('[ADMIN] Synagogues export error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to export synagogues: ${error instanceof Error ? error.message : String(error)}`);
  }
}
