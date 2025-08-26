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

    // Validate sort parameters to prevent SQL injection
    const allowedColumns = ['created_at', 'name', 'city', 'state', 'address', 'phone_number'];
    const validSortBy = allowedColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

    const conditions: Prisma.Sql[] = [];
    if (search) {
      const like = `%${search}%`;
      conditions.push(Prisma.sql`(name ILIKE ${like} OR address ILIKE ${like} OR city ILIKE ${like} OR rabbi ILIKE ${like})`);
    }
    if (city) {
      const like = `%${city}%`;
      conditions.push(Prisma.sql`city ILIKE ${like}`);
    }
    if (state) {
      const like = `%${state}%`;
      conditions.push(Prisma.sql`state ILIKE ${like}`);
    }
    if (affiliation) {
      const like = `%${affiliation}%`;
      conditions.push(Prisma.sql`affiliation ILIKE ${like}`);
    }
    const whereClause = conditions.length ? Prisma.sql`WHERE ${conditions.reduce((acc, condition, index) => 
      index === 0 ? condition : Prisma.sql`${acc} AND ${condition}`
    )}` : Prisma.sql``;

    // Get total count
    const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM florida_synagogues ${whereClause}
    `;
    const total = Number(countResult[0]?.count || 0);

    // Calculate pagination
    const offset = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated data
    const dataResult = await prisma.$queryRaw<any[]>`
      SELECT * FROM florida_synagogues
      ${whereClause}
      ORDER BY ${Prisma.raw(validSortBy)} ${Prisma.raw(validSortOrder)}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

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
