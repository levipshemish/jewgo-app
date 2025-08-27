import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/utils/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const total = await prisma.adminRole.count();
    const roles = await prisma.adminRole.findMany({
      orderBy: { assignedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, email: true, name: true, issuperadmin: true } },
      },
    });

    return NextResponse.json({
      data: roles.map((r) => ({
        id: r.id,
        user_id: r.userId,
        role: r.role,
        assigned_by: r.assignedBy || '',
        assigned_at: r.assignedAt,
        expires_at: r.expiresAt || undefined,
        is_active: r.isActive,
        notes: r.notes || undefined,
        user: {
          id: r.user.id,
          email: r.user.email,
          name: r.user.name || undefined,
          issuperadmin: r.user.issuperadmin,
        },
        assignedBy: { id: r.assignedBy || '', email: r.assignedBy || '', name: undefined },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    adminLogger.error('Roles list error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// No-op writes for now to keep UI functional
export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_EDIT)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // CSRF
  const headerToken = request.headers.get('x-csrf-token');
  if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
  }

  const body = await request.json();
  const { userId, role, expiresAt, notes } = body || {};
  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
  }

  const created = await prisma.adminRole.create({
    data: {
      userId,
      role: String(role),
      assignedBy: adminUser.id,
      assignedAt: new Date(),
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes ? String(notes) : null,
    },
  });

  await logAdminAction(adminUser, 'role_assign', 'admin_role', {
    entityId: String(userId),
    metadata: {
      actorId: adminUser.id,
      targetUserId: String(userId),
      role: String(role),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      notes: notes ? String(notes) : undefined,
      assignmentId: String(created.id),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_EDIT)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // CSRF
  const headerToken = request.headers.get('x-csrf-token');
  if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
  }

  const body = await request.json();
  const { id, isActive, expiresAt } = body || {};
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updated = await prisma.adminRole.update({
    where: { id: Number(id) },
    data: {
      isActive: typeof isActive === 'boolean' ? isActive : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    },
  });
  await logAdminAction(adminUser, 'role_update', 'admin_role', {
    entityId: String(id),
    metadata: {
      actorId: adminUser.id,
      roleId: String(id),
      changes: {
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      },
    },
  });

  return NextResponse.json({ ok: true, updated });
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_DELETE)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // CSRF
  const headerToken = request.headers.get('x-csrf-token');
  if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');
  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
  }

  // Deactivate any active matching role assignments
  const result = await prisma.adminRole.updateMany({
    where: { userId, role, isActive: true },
    data: { isActive: false },
  });
  await logAdminAction(adminUser, 'role_remove', 'admin_role', {
    entityId: String(userId),
    metadata: {
      actorId: adminUser.id,
      targetUserId: String(userId),
      role: String(role),
      affectedCount: result.count,
    },
  });

  return NextResponse.json({ ok: true, deactivated: result.count });
}
