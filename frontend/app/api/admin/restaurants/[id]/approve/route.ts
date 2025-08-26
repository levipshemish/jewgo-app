import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_MODERATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    // Get the restaurant to check current status
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: parseInt(id) },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    if (restaurant.submission_status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Restaurant is not pending approval' },
        { status: 400 }
      );
    }

    // Update restaurant status to approved
    const updatedRestaurant = await AdminDatabaseService.updateRecord(
      prisma.restaurant,
      'restaurant',
      id,
      {
        submission_status: 'approved',
        approval_date: new Date(),
        approved_by: adminUser.id,
      },
      adminUser,
      'restaurant'
    );

    // Log the approval action
    await logAdminAction(adminUser, 'restaurant_approve', 'restaurant', {
      entityId: id,
      oldData: restaurant,
      newData: updatedRestaurant,
      metadata: {
        action: 'approve',
        restaurantName: restaurant.name,
      },
    });

    return NextResponse.json({
      message: 'Restaurant approved successfully',
      data: updatedRestaurant,
    });
  } catch (error) {
    console.error('[ADMIN] Restaurant approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve restaurant' },
      { status: 500 }
    );
  }
}
