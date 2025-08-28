import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.DEFAULT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only super admins can view roles
    if (!adminUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Get admin roles with pagination
    const total = await prisma.adminRole.count();
    const roles = await prisma.adminRole.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            issuperadmin: true,
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json({
      data: roles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext,
        hasPrev,
      }
    });
  } catch (error) {
    console.error('[ADMIN] Roles GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin roles' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only super admins can update roles
    if (!adminUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Parse request body
    const { id, isActive, expiresAt } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Update role
    const updatedRole = await prisma.adminRole.update({
      where: { id: parseInt(id) },
      data: {
        isActive: isActive,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            issuperadmin: true,
          }
        }
      }
    });

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.USER_ROLE_CHANGE, 'admin_role', {
      entityId: id.toString(),
      metadata: {
        roleId: id,
        isActive,
        expiresAt,
        targetUserId: updatedRole.userId
      }
    });

    return NextResponse.json({ data: updatedRole });
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
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only super admins can delete roles
    if (!adminUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
    }

    // Find and delete the role
    const roleToDelete = await prisma.adminRole.findFirst({
      where: {
        userId: userId,
        role: role
      }
    });

    if (!roleToDelete) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Log the action before deletion
    await logAdminAction(adminUser, AUDIT_ACTIONS.USER_ROLE_CHANGE, 'admin_role', {
      entityId: roleToDelete.id.toString(),
      metadata: {
        action: 'delete',
        roleId: roleToDelete.id,
        userId,
        role
      }
    });

    // Delete the role
    await prisma.adminRole.delete({
      where: { id: roleToDelete.id }
    });

    return NextResponse.json({ message: 'Role removed successfully' });
  } catch (error) {
    console.error('[ADMIN] Roles DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove admin role' },
      { status: 500 }
    );
  }
}
