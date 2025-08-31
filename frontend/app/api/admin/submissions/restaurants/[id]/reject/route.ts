import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { Permission } from '@/lib/constants/permissions';

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
    if (!adminUser.permissions.includes('restaurant:edit')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const restaurantId = id;
    const body = await request.json();
    const { reason } = body;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo-app-oyoh.onrender.com';

    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    // Call the frontend API route for restaurant rejection
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/restaurants/${restaurantId}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        status: 'rejected',
        reason: reason || 'Rejected by admin'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to reject restaurant', details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Log the action
    await logAdminAction(adminUser, 'restaurant_reject', 'restaurant', {
      entityId: restaurantId,
      newData: { ...result, rejection_reason: reason },
      auditLevel: 'warning',
    });

    return NextResponse.json(result);
  } catch (error) {
    adminLogger.error('Restaurant reject error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to reject restaurant' },
      { status: 500 }
    );
  }
}
