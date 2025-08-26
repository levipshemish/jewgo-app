import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYNAGOGUE_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    // Validate pagination
    const rawPage = parseInt(searchParams.get('page') || '1');
    const rawPageSize = parseInt(searchParams.get('pageSize') || '20');
    const { page, pageSize } = (await import('@/lib/admin/validation')).validationUtils.validatePagination({ page: rawPage, pageSize: rawPageSize });
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const affiliation = searchParams.get('affiliation') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate sort parameters to prevent SQL injection
    const allowedColumns = ['created_at', 'name', 'city', 'state', 'address', 'phone'];
    const validSortBy = allowedColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR rabbi ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (city) {
      conditions.push(`city ILIKE $${paramIndex}`);
      params.push(`%${city}%`);
      paramIndex++;
    }
    if (state) {
      conditions.push(`state ILIKE $${paramIndex}`);
      params.push(`%${state}%`);
      paramIndex++;
    }
    if (affiliation) {
      conditions.push(`affiliation ILIKE $${paramIndex}`);
      params.push(`%${affiliation}%`);
      paramIndex++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM florida_synagogues ${whereClause}`;
    const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(countQuery, ...params);
    const total = Number(countResult[0]?.count || 0);

    // Calculate pagination
    const offset = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM florida_synagogues
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await prisma.$queryRawUnsafe<any[]>(dataQuery, ...params, pageSize, offset);

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
