import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || !validateSignedCSRFToken(csrfToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    const restaurantId = parseInt(id);
    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    // Get request body for rejection reason
    const body = await request.json();
    const rejectionReason = body.reason || 'Rejected by admin';

    // Get the restaurant to check current status
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, submission_status: true, status: true }
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Update restaurant status
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        submission_status: 'rejected',
        rejection_reason: rejectionReason,
        status: 'inactive',
        updated_at: new Date(),
      },
    });

    adminLogger.info('Restaurant rejected', { 
      restaurantId, 
      restaurantName: restaurant.name,
      adminUserId: adminUser.id,
      rejectionReason 
    });

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.RESTAURANT_REJECT, 'restaurant', {
      entityId: restaurantId.toString(),
      oldData: { submission_status: restaurant.submission_status, status: restaurant.status },
      newData: { submission_status: 'rejected', status: 'inactive', rejection_reason: rejectionReason },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Restaurant rejected successfully',
      restaurant: updatedRestaurant 
    });
  } catch (error) {
    adminLogger.error('Restaurant rejection error', { 
      error: String(error), 
      restaurantId: id 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to reject restaurant',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
