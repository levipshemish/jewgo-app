import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_APPROVE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Parse and validate ID
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    // Check if restaurant exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: parsedId }
    });

    if (!existingRestaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Update restaurant status
    const now = new Date();
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: parsedId },
      data: {
        submission_status: 'approved',
        approval_date: now,
        approved_by: adminUser.id,
        updated_at: now
      }
    });

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.RESTAURANT_APPROVE, 'restaurant', {
      entityId: parsedId.toString(),
      metadata: {
        previousStatus: existingRestaurant.submission_status,
        newStatus: 'approved',
        approvalDate: now.toISOString()
      }
    });

    return NextResponse.json({ data: updatedRestaurant });
  } catch (error) {
    console.error('[ADMIN] Restaurant approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve restaurant' },
      { status: 500 }
    );
  }
}
