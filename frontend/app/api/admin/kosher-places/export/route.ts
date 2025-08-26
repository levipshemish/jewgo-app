import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { logAdminAction } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.KOSHER_PLACE_VIEW)) {
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
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const category = searchParams.get('category') || undefined;
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

    // Build where clause
    const where: any = {};
    if (city) { where.city = { contains: city, mode: 'insensitive' as const }; }
    if (state) { where.state = { contains: state, mode: 'insensitive' as const }; }
    if (category) { where.category = { contains: category, mode: 'insensitive' as const }; }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
        { city: { contains: search, mode: 'insensitive' as const } },
        { state: { contains: search, mode: 'insensitive' as const } },
        { category: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Build order by
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get data from marketplace table to match listing source
    const kosherPlaces = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        name,
        location as address,
        city,
        state,
        zip_code,
        vendor_phone as phone,
        vendor_website as website,
        vendor_email as email,
        category,
        status,
        created_at,
        updated_at
      FROM marketplace 
      WHERE ${where.city ? Prisma.sql`city ILIKE ${`%${city}%`}` : Prisma.sql`1=1`}
        AND ${where.state ? Prisma.sql`state ILIKE ${`%${state}%`}` : Prisma.sql`1=1`}
        AND ${where.category ? Prisma.sql`category ILIKE ${`%${category}%`}` : Prisma.sql`1=1`}
        AND ${search ? Prisma.sql`(name ILIKE ${`%${search}%`} OR location ILIKE ${`%${search}%`} OR city ILIKE ${`%${search}%`} OR state ILIKE ${`%${search}%`} OR category ILIKE ${`%${search}%`})` : Prisma.sql`1=1`}
      ORDER BY ${Prisma.sql`${sortBy} ${sortOrder}`}
      LIMIT 10000
    `;

    // Convert to CSV
    if (kosherPlaces.length === 0) {
      const response = new NextResponse('', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="kosher_places_export_${new Date().toISOString().split('T')[0]}.csv"`,
          'Cache-Control': 'no-cache',
        },
      });
      return response;
    }

    const exportFields = [
      'id',
      'name',
      'address',
      'city',
      'state',
      'zip_code',
      'phone',
      'website',
      'email',
      'category',
      'status',
      'created_at',
      'updated_at',
    ];

    const csvHeaders = exportFields.map(field => `"${field}"`).join(',');
    
    const csvRows = kosherPlaces.map((item: any) => 
      exportFields.map(field => {
        const value = item[field];
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [csvHeaders, ...csvRows].join('\n');

    // Log the export action
    await logAdminAction(adminUser, 'kosher_place_export', 'kosher_place', {
      metadata: {
        search,
        city,
        state,
        category,
        totalCount: kosherPlaces.length,
        exportedCount: kosherPlaces.length,
        limited: false,
      },
    });

    // Return CSV response
    const response = new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="kosher_places_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    console.error('[ADMIN] Kosher place export error:', error);
    return NextResponse.json(
      { error: 'Failed to export kosher places' },
      { status: 500 }
    );
  }
}
