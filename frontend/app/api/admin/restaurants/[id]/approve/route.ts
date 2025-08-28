import { NextResponse, NextRequest } from 'next/server';
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
        submission_status: 'approved',
        approval_date: new Date(),
        approved_by: adminUser.id,
        status: 'active',
        updated_at: new Date(),
      },
    });

    adminLogger.info('Restaurant approved', { 
      restaurantId, 
      restaurantName: restaurant.name,
      adminUserId: adminUser.id 
    });

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.RESTAURANT_APPROVE, 'restaurant', {
      entityId: restaurantId.toString(),
      oldData: { submission_status: restaurant.submission_status, status: restaurant.status },
      newData: { submission_status: 'approved', status: 'active', approval_date: new Date() },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Restaurant approved successfully',
      restaurant: updatedRestaurant 
    });
  } catch (error) {
    adminLogger.error('Restaurant approval error', { 
      error: String(error), 
      restaurantId: id 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to approve restaurant',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
