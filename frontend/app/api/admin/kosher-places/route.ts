import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { logAdminAction, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { safeOrderExpr } from '@/lib/admin/sql';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { errorResponses, createSuccessResponse } from '@/lib';

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
      return errorResponses.unauthorized();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.KOSHER_PLACE_VIEW)) {
      return errorResponses.forbidden();
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    // Validate pagination
    const rawPage = parseInt(searchParams.get('page') || '1');
    const rawPageSize = parseInt(searchParams.get('pageSize') || '20');
    const { page, pageSize } = (await import('@/lib/admin/validation')).validationUtils.validatePagination({ page: rawPage, pageSize: rawPageSize });
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate sort parameters to prevent SQL injection
    const allowedColumns = ['created_at', 'name', 'title', 'vendor_name', 'location', 'category', 'status'];

    // Build WHERE clause safely
    const conditions: Prisma.Sql[] = [];
    if (search) {
      const like = `%${search}%`;
      conditions.push(Prisma.sql`(name ILIKE ${like} OR title ILIKE ${like} OR vendor_name ILIKE ${like} OR location ILIKE ${like})`);
    }
    if (category) {
      const like = `%${category}%`;
      conditions.push(Prisma.sql`category ILIKE ${like}`);
    }
    if (status) {
      const like = `%${status}%`;
      conditions.push(Prisma.sql`status ILIKE ${like}`);
    }
    const whereClause = conditions.length ? Prisma.sql`WHERE ${conditions.reduce((acc, condition, index) => 
      index === 0 ? condition : Prisma.sql`${acc} AND ${condition}`
    )}` : Prisma.sql``;

    // Get total count
    const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM marketplace ${whereClause}
    `;
    const total = Number(countResult[0]?.count || 0);

    // Calculate pagination
    const offset = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated data
    // Order by validated columns only via CASE mapping to avoid injection
    const orderExpr = safeOrderExpr(allowedColumns, sortBy, sortOrder);
    const dataResult = await prisma.$queryRaw<any[]>`
      SELECT * FROM marketplace
      ${whereClause}
      ORDER BY ${orderExpr}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // Log the action
    await logAdminAction(adminUser, 'kosher_place_list_view', 'marketplace', {
      metadata: { page, pageSize, search, filters: { category, status } },
      whitelistFields: AUDIT_FIELD_ALLOWLISTS.MARKETPLACE,
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
    adminLogger.error('Kosher place list error', { error: String(error) });
    return errorResponses.internalError();
  }
}
