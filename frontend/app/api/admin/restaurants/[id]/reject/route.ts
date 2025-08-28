import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { logAdminAction, ENTITY_TYPES, AUDIT_ACTIONS, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { AdminErrors } from '@/lib/admin/errors';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = await context.params;
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_APPROVE)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return AdminErrors.CSRF_ERROR();
    }

    // Parse and validate restaurant ID
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return AdminErrors.INVALID_ID('Restaurant ID must be a valid number');
    }

    // Parse request body for rejection reason
    const body = await request.json();
    const rejectionReason = body.reason || 'Rejected by admin';

    // Update restaurant status
    const now = new Date();
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        submission_status: 'rejected',
        approval_date: now,
        approved_by: adminUser.id,
        rejection_reason: rejectionReason,
        updated_at: now,
      },
    });

    // Log the admin action
    await logAdminAction(adminUser, AUDIT_ACTIONS.RESTAURANT_REJECT, ENTITY_TYPES.RESTAURANT, {
      entityId: String(id),
      newData: {
        submission_status: 'rejected',
        approval_date: now,
        approved_by: adminUser.id,
        rejection_reason: rejectionReason,
      },
      whitelistFields: AUDIT_FIELD_ALLOWLISTS.RESTAURANT,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Restaurant rejected successfully',
      data: updatedRestaurant 
    });

  } catch (error) {
    console.error('[ADMIN] Restaurant rejection error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to reject restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}
