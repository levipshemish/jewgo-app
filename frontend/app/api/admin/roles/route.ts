import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db/prisma';
import { corsHeaders } from '@/lib/middleware/security';
import { logAdminAction, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { role: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get admin roles with pagination
    const [roles, total] = await Promise.all([
      prisma.adminRole.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              issuperadmin: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminRole.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: roles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Roles fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin roles' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { id, is_active, expires_at } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Update admin role
    const updatedRole = await prisma.adminRole.update({
      where: { id: parseInt(id) },
      data: {
        isActive: is_active !== undefined ? is_active : undefined,
        expiresAt: expires_at || null,
      },
              include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              issuperadmin: true,
            },
          },
        },
    });

    // Log the action
    await logAdminAction(adminUser, 'role_update', 'admin_role', {
      entityId: id.toString(),
      oldData: { id, is_active, expires_at },
      newData: { id, is_active, expires_at },
      whitelistFields: AUDIT_FIELD_ALLOWLISTS.ADMIN_ROLE,
    });

    return NextResponse.json({
      message: 'Admin role updated successfully',
      data: updatedRole,
    });
  } catch (error) {
    console.error('[ADMIN] Role update error:', error);
    return NextResponse.json(
      { error: 'Failed to update admin role' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Get role data before deletion for audit
    const roleToDelete = await prisma.adminRole.findUnique({
      where: { id: parseInt(id) },
    });

    // Delete admin role
    await prisma.adminRole.delete({
      where: { id: parseInt(id) },
    });

    // Log the action
    await logAdminAction(adminUser, 'role_delete', 'admin_role', {
      entityId: id.toString(),
      oldData: roleToDelete,
      whitelistFields: AUDIT_FIELD_ALLOWLISTS.ADMIN_ROLE,
    });

    return NextResponse.json({
      message: 'Admin role deleted successfully',
    });
  } catch (error) {
    console.error('[ADMIN] Role delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin role' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
