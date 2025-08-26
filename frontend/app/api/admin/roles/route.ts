import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { prisma } from '@/lib/db/prisma';

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
    console.error('[ADMIN] Roles list error:', error);
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
  return NextResponse.json({ message: 'Role assignment not implemented yet' });
}

export async function PUT(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_EDIT)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return NextResponse.json({ message: 'Role update not implemented yet' });
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_DELETE)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return NextResponse.json({ message: 'Role removal not implemented yet' });
}

