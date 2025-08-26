import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';

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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_APPROVE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const restaurantId = parseInt(id);

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    // Update restaurant submission status
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        submission_status: 'approved',
        approval_date: new Date(),
        approved_by: adminUser.email,
        rejection_reason: null, // Clear any previous rejection reason
      },
    });

    // Log the action
    await logAdminAction(adminUser, 'restaurant_approved', 'restaurant', {
      entityId: restaurantId.toString(),
      metadata: { restaurantName: updatedRestaurant.name },
    });

    return NextResponse.json({
      message: 'Restaurant approved successfully',
      data: updatedRestaurant,
    });
  } catch (error) {
    console.error('[ADMIN] Restaurant approval error:', error);
    
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to approve restaurant' },
      { status: 500 }
    );
  }
}
