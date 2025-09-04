import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { invalidateDashboardMetrics } from '@/lib/server/cache';
import { logAdminAction, ENTITY_TYPES, AUDIT_ACTIONS, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';
import { corsHeaders } from '@/lib/middleware/security';
import { errorResponses, createSuccessResponse } from '@/lib';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { params } = await context;
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_EDIT)) {
      return errorResponses.forbidden();
    }
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }
    const { id } = await params;
    const restaurantId = Number(id);
    if (!Number.isInteger(restaurantId)) {
      return errorResponses.badRequest();
    }

    // Get request body for rejection reason
    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponses.badRequest();
    }
    const rejectionReason = body.reason || 'Rejected by admin';

    // Update restaurant status
    const now = new Date();
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        submission_status: 'rejected',
        rejection_reason: rejectionReason,
        approved_by: null,
        approval_date: null,
        updated_at: now,
      },
    });

    // Log the admin action
    await logAdminAction(adminUser, AUDIT_ACTIONS.RESTAURANT_REJECT, ENTITY_TYPES.RESTAURANT, {
      entityId: String(restaurantId),
      newData: {
        submission_status: 'rejected',
        rejection_reason: rejectionReason,
        approved_by: null,
      },
      whitelistFields: AUDIT_FIELD_ALLOWLISTS.RESTAURANT,
    });

    return createSuccessResponse({ message: 'Restaurant rejected successfully' });

    // Invalidate dashboard metrics cache (best-effort)
    // eslint-disable-next-line no-console
    invalidateDashboardMetrics().catch(() => {});
  } catch (error) {
    console.error('[ADMIN] Restaurant reject error:', error);
    return errorResponses.internalError();
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
