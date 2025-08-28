import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Parse request body for filters
    const body = await request.json();
    const { search, filters } = body;

    // Build where clause
    const where: any = {};
    
    if (filters) {
      if (filters.city) { where.city = filters.city; }
      if (filters.state) { where.state = filters.state; }
      if (filters.affiliation) { where.affiliation = filters.affiliation; }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { rabbi: { contains: search, mode: 'insensitive' as const } },
        { city: { contains: search, mode: 'insensitive' as const } },
        { state: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Get all synagogues matching filters (mock data since synagogue model doesn't exist)
    const synagogues: any[] = [];

    // Generate CSV content
    const csvHeaders = [
      'ID', 'Name', 'Address', 'City', 'State', 'Zip Code', 'Rabbi', 'Affiliation',
      'Phone', 'Email', 'Website', 'Social Media', 'Shacharit', 'Mincha', 'Maariv',
      'Shabbat', 'Sunday', 'Weekday', 'Kosher Info', 'Parking', 'Accessibility',
      'Additional Info', 'URL', 'Data Quality Score', 'Is Chabad', 'Is Young Israel',
      'Is Sephardic', 'Has Address', 'Has Zip', 'Latitude', 'Longitude',
      'Created At', 'Updated At'
    ];

    const csvRows = synagogues.map((synagogue: any) => [
      synagogue.id,
      `"${(synagogue.name || '').replace(/"/g, '""')}"`,
      `"${(synagogue.address || '').replace(/"/g, '""')}"`,
      `"${(synagogue.city || '').replace(/"/g, '""')}"`,
      `"${(synagogue.state || '').replace(/"/g, '""')}"`,
      `"${(synagogue.zip_code || '').replace(/"/g, '""')}"`,
      `"${(synagogue.rabbi || '').replace(/"/g, '""')}"`,
      `"${(synagogue.affiliation || '').replace(/"/g, '""')}"`,
      `"${(synagogue.phone || '').replace(/"/g, '""')}"`,
      `"${(synagogue.email || '').replace(/"/g, '""')}"`,
      `"${(synagogue.website || '').replace(/"/g, '""')}"`,
      `"${(synagogue.social_media || '').replace(/"/g, '""')}"`,
      `"${(synagogue.shacharit || '').replace(/"/g, '""')}"`,
      `"${(synagogue.mincha || '').replace(/"/g, '""')}"`,
      `"${(synagogue.maariv || '').replace(/"/g, '""')}"`,
      `"${(synagogue.shabbat || '').replace(/"/g, '""')}"`,
      `"${(synagogue.sunday || '').replace(/"/g, '""')}"`,
      `"${(synagogue.weekday || '').replace(/"/g, '""')}"`,
      `"${(synagogue.kosher_info || '').replace(/"/g, '""')}"`,
      `"${(synagogue.parking || '').replace(/"/g, '""')}"`,
      `"${(synagogue.accessibility || '').replace(/"/g, '""')}"`,
      `"${(synagogue.additional_info || '').replace(/"/g, '""')}"`,
      `"${(synagogue.url || '').replace(/"/g, '""')}"`,
      synagogue.data_quality_score || '',
      synagogue.is_chabad ? 'Yes' : 'No',
      synagogue.is_young_israel ? 'Yes' : 'No',
      synagogue.is_sephardic ? 'Yes' : 'No',
      synagogue.has_address ? 'Yes' : 'No',
      synagogue.has_zip ? 'Yes' : 'No',
      synagogue.latitude || '',
      synagogue.longitude || '',
      `"${(synagogue.created_at || '').toString()}"`,
      `"${(synagogue.updated_at || '').toString()}"`
    ]);

    const csvContent = [csvHeaders.join(','), ...csvRows.map((row: any) => row.join(','))].join('\n');

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.DATA_EXPORT, 'synagogue', {
      metadata: {
        recordCount: synagogues.length,
        filters: { search, filters },
        exportFormat: 'CSV'
      }
    });

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="florida_synagogues_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('[ADMIN] Synagogue export error:', error);
    return NextResponse.json(
      { error: 'Failed to export synagogue data' },
      { status: 500 }
    );
  }
}
