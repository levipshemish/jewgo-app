import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { logAdminAction } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Get all admin roles with user information
    const roles = await prisma.adminRole.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    // Log the action
    await logAdminAction(adminUser, 'role_list_view', 'role', {
      metadata: {
        action: 'view_roles',
        totalRoles: roles.length,
      },
    });

    return NextResponse.json({ data: roles });
  } catch (error) {
    console.error('[ADMIN] Roles GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Parse request body
    const body = await request.json();
    const { userId, role } = body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!role || !['admin', 'moderator', 'super_admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (admin, moderator, super_admin)' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has an active role
    const existingRole = await prisma.adminRole.findFirst({
      where: {
        userId: userId,
        isActive: true,
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'User already has an active admin role' },
        { status: 409 }
      );
    }

    // Create new admin role
    await prisma.adminRole.create({
      data: {
        userId: userId,
        role: role,
        isActive: true,
        assignedBy: adminUser.id,
      },
    });

    // Log the action
    await logAdminAction(adminUser, 'role_create', 'role', {
      entityId: userId,
      metadata: {
        action: 'create_role',
        userId,
        role,
        createdBy: adminUser.id,
      },
    });

    return NextResponse.json({
      message: 'Admin role created successfully',
      data: { userId, role },
    }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN] Roles POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create admin role' },
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

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Parse request body
    const body = await request.json();
    const { roleId, role } = body;

    // Validate required fields
    if (!roleId || typeof roleId !== 'string') {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    if (!role || !['admin', 'moderator', 'super_admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (admin, moderator, super_admin)' },
        { status: 400 }
      );
    }

    // Get current role for audit
    const currentRole = await prisma.adminRole.findFirst({
      where: {
        id: parseInt(roleId),
        isActive: true,
      },
    });

    if (!currentRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Update role
    await prisma.adminRole.update({
      where: {
        id: parseInt(roleId),
      },
      data: {
        role: role,
      },
    });

    // Log the action
    await logAdminAction(adminUser, 'role_update', 'role', {
      entityId: roleId,
      oldData: currentRole,
      newData: { ...currentRole, role },
      metadata: {
        action: 'update_role',
        roleId,
        oldRole: currentRole.role,
        newRole: role,
        updatedBy: adminUser.id,
      },
    });

    return NextResponse.json({
      message: 'Admin role updated successfully',
      data: { roleId, role },
    });
  } catch (error) {
    console.error('[ADMIN] Roles PUT error:', error);
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

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Get role ID from query params
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Get current role for audit
    const currentRole = await prisma.adminRole.findFirst({
      where: {
        id: parseInt(roleId),
        isActive: true,
      },
    });

    if (!currentRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Prevent self-deletion of roles
    if (currentRole.userId === adminUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin role' },
        { status: 400 }
      );
    }

    // Soft delete role
    await prisma.adminRole.update({
      where: {
        id: parseInt(roleId),
      },
      data: {
        isActive: false,
      },
    });

    // Log the action
    await logAdminAction(adminUser, 'role_delete', 'role', {
      entityId: roleId,
      oldData: currentRole,
      metadata: {
        action: 'delete_role',
        roleId,
        userId: currentRole.userId,
        role: currentRole.role,
        deletedBy: adminUser.id,
      },
    });

    return NextResponse.json({
      message: 'Admin role deleted successfully',
    });
  } catch (error) {
    console.error('[ADMIN] Roles DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin role' },
      { status: 500 }
    );
  }
}
