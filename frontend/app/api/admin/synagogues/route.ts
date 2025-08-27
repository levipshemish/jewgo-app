import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { logAdminAction } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { safeOrderExpr } from '@/lib/admin/sql';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.DEFAULT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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

    // Build WHERE clause using parameterized SQL
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

    // Total count (safe)
    const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM florida_synagogues ${whereClause}
    `;
    const total = Number(countResult[0]?.count || 0);

    // Pagination
    const offset = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // ORDER BY expression (validated)
    const orderExpr = safeOrderExpr(allowedColumns, sortBy, sortOrder);

    // Data query (safe)
    const dataResult = await prisma.$queryRaw<any[]>`
      SELECT * FROM florida_synagogues
      ${whereClause}
      ORDER BY ${orderExpr}
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
    adminLogger.error('Synagogue list error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch synagogues' },
      { status: 500 }
    );
  }
}
