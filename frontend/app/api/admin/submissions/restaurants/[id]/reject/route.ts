import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';

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
    if (!adminUser.permissions.includes('RESTAURANT_EDIT')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const restaurantId = id;
    const body = await request.json();
    const { reason } = body;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    // Proxy to Flask backend
    const response = await fetch(`${backendUrl}/api/v4/restaurants/${restaurantId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: Backend authentication should be handled by the backend
        // For now, we'll send the request without auth and let the backend handle it
      },
      body: JSON.stringify({ reason }),
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
    console.error('[ADMIN] Restaurant reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject restaurant' },
      { status: 500 }
    );
  }
}
