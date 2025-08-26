import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_APPROVE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    const { id } = await context.params;
    const restaurantId = Number(id);
    if (!Number.isInteger(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason: string | undefined = body?.reason;

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        submission_status: 'rejected',
        approval_date: null,
        approved_by: null,
        rejection_reason: reason || 'Rejected by admin',
      },
    });

    await logAdminAction(adminUser, 'RESTAURANT_REJECT', 'restaurant', {
      entityId: String(restaurantId),
      newData: { submission_status: 'rejected', rejection_reason: updated.rejection_reason },
      auditLevel: 'warning',
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[ADMIN] Restaurant reject error:', error);
    return NextResponse.json({ error: 'Failed to reject restaurant' }, { status: 500 });
  }
}

