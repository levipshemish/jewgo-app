import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';

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

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        submission_status: 'approved',
        approval_date: new Date(),
        approved_by: adminUser.id,
        rejection_reason: null,
      },
    });

    await logAdminAction(adminUser, AUDIT_ACTIONS.RESTAURANT_APPROVE, 'restaurant', {
      entityId: String(restaurantId),
      newData: { submission_status: 'approved' },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[ADMIN] Restaurant approve error:', error);
    return NextResponse.json({ error: 'Failed to approve restaurant' }, { status: 500 });
  }
}
