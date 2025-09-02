import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { invalidateDashboardMetrics } from '@/lib/server/cache';
import { logAdminAction, ENTITY_TYPES, AUDIT_ACTIONS, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';
import { corsHeaders } from '@/lib/middleware/security';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { params } = await context;
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }
    const { id } = await params;
    const restaurantId = Number(id);
    if (!Number.isInteger(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    // Get request body for rejection reason
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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

    return NextResponse.json({ 
      success: true, 
      message: 'Restaurant rejected successfully',
      data: updatedRestaurant 
    });

    // Invalidate dashboard metrics cache (best-effort)
    // eslint-disable-next-line no-console
    invalidateDashboardMetrics().catch(() => {});
  } catch (error) {
    console.error('[ADMIN] Restaurant reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject restaurant' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
