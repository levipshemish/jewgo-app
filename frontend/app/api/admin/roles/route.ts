import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { logAdminAction, ENTITY_TYPES, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { AdminErrors } from '@/lib/admin/errors';

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
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_VIEW)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;

    // Build where conditions
    const whereConditions: any = {};
    if (search) {
      whereConditions.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { role: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get paginated admin roles
    const [roles, total] = await Promise.all([
      prisma.adminRole.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              issuperadmin: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { assigned_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminRole.count({ where: whereConditions }),
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
    console.error('[ADMIN] Get admin roles error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to get admin roles: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions - only super admins can create roles
    if (!adminUser.isSuperAdmin) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return AdminErrors.CSRF_ERROR();
    }

    // Parse request body
    const body = await request.json();
    const { user_id, role, expires_at, notes } = body;

    // Validate required fields
    if (!user_id || !role) {
      return AdminErrors.INVALID_REQUEST('User ID and role are required');
    }

    // Validate role
    const validRoles = ['moderator', 'data_admin', 'system_admin'];
    if (!validRoles.includes(role)) {
      return AdminErrors.INVALID_REQUEST('Invalid role');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, email: true, issuperadmin: true },
    });

    if (!user) {
      return AdminErrors.NOT_FOUND('User not found');
    }

    if (user.issuperadmin) {
      return AdminErrors.INVALID_REQUEST('Cannot assign roles to super admin users');
    }

    // Create admin role
    const adminRole = await prisma.adminRole.create({
      data: {
        user_id,
        role,
        assigned_by: adminUser.id,
        assigned_at: new Date(),
        expires_at: expires_at ? new Date(expires_at) : null,
        notes,
        is_active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.USER_ROLE_CHANGE, ENTITY_TYPES.ADMIN_ROLE, {
      entityId: String(adminRole.id),
      newData: {
        user_id,
        role,
        assigned_by: adminUser.id,
        expires_at,
        notes,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin role created successfully',
      data: adminRole 
    }, { status: 201 });

  } catch (error) {
    console.error('[ADMIN] Create admin role error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to create admin role: ${error instanceof Error ? error.message : String(error)}`);
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
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions - only super admins can edit roles
    if (!adminUser.isSuperAdmin) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return AdminErrors.CSRF_ERROR();
    }

    // Parse request body
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return AdminErrors.INVALID_REQUEST('Role ID is required');
    }

    // Get current role for audit
    const currentRole = await prisma.adminRole.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            issuperadmin: true,
          },
        },
      },
    });

    if (!currentRole) {
      return AdminErrors.NOT_FOUND('Admin role not found');
    }

    if (currentRole.user.issuperadmin) {
      return AdminErrors.INVALID_REQUEST('Cannot modify roles for super admin users');
    }

    // Update admin role
    const updatedRole = await prisma.adminRole.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.USER_ROLE_CHANGE, ENTITY_TYPES.ADMIN_ROLE, {
      entityId: String(id),
      oldData: currentRole,
      newData: updatedRole,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin role updated successfully',
      data: updatedRole 
    });

  } catch (error) {
    console.error('[ADMIN] Update admin role error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to update admin role: ${error instanceof Error ? error.message : String(error)}`);
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
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions - only super admins can delete roles
    if (!adminUser.isSuperAdmin) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return AdminErrors.CSRF_ERROR();
    }

    // Get role ID from query params
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    if (!idParam || isNaN(Number(idParam))) {
      return AdminErrors.INVALID_REQUEST('Valid role ID is required');
    }

    const id = parseInt(idParam);

    // Get current role for audit
    const currentRole = await prisma.adminRole.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            issuperadmin: true,
          },
        },
      },
    });

    if (!currentRole) {
      return AdminErrors.NOT_FOUND('Admin role not found');
    }

    if (currentRole.user.issuperadmin) {
      return AdminErrors.INVALID_REQUEST('Cannot delete roles for super admin users');
    }

    // Delete admin role
    await prisma.adminRole.delete({
      where: { id },
    });

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.USER_ROLE_CHANGE, ENTITY_TYPES.ADMIN_ROLE, {
      entityId: String(id),
      oldData: currentRole,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin role deleted successfully' 
    });

  } catch (error) {
    console.error('[ADMIN] Delete admin role error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to delete admin role: ${error instanceof Error ? error.message : String(error)}`);
  }
}
