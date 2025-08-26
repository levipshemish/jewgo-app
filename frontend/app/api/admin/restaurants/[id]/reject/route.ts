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

    // Parse request body for rejection reason
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Update restaurant submission status
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        submission_status: 'rejected',
        rejection_reason: reason.trim(),
        approval_date: null, // Clear any previous approval
        approved_by: null,
      },
    });

    // Log the action
    await logAdminAction(adminUser, 'restaurant_rejected', 'restaurant', {
      entityId: restaurantId.toString(),
      metadata: { 
        restaurantName: updatedRestaurant.name,
        rejectionReason: reason.trim(),
      },
    });

    return NextResponse.json({
      message: 'Restaurant rejected successfully',
      data: updatedRestaurant,
    });
  } catch (error) {
    console.error('[ADMIN] Restaurant rejection error:', error);
    
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to reject restaurant' },
      { status: 500 }
    );
  }
}
