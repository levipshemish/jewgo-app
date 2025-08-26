import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/auth';
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const affiliation = searchParams.get('affiliation') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR rabbi ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (city) {
      whereConditions.push(`city ILIKE $${paramIndex}`);
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (state) {
      whereConditions.push(`state ILIKE $${paramIndex}`);
      params.push(`%${state}%`);
      paramIndex++;
    }

    if (affiliation) {
      whereConditions.push(`affiliation ILIKE $${paramIndex}`);
      params.push(`%${affiliation}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM florida_synagogues ${whereClause}`;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
    const total = parseInt((countResult as any)[0].count);

    // Calculate pagination
    const offset = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM florida_synagogues 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await prisma.$queryRawUnsafe(dataQuery, ...params, pageSize, offset);

    // Log the action
    await logAdminAction(adminUser, 'synagogue_list_view', 'florida_synagogue', {
      metadata: { page, pageSize, search, filters: { city, state, affiliation } },
    });

    return NextResponse.json({
      data: dataResult,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Synagogue list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch synagogues' },
      { status: 500 }
    );
  }
}
