import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { mapUsersToApiResponse, mapApiRequestToUser } from '@/lib/admin/dto/user';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '20');
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdat';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Reject unknown/unsupported filters to prevent Prisma errors
    const allowedParams = new Set(['page', 'pageSize', 'search', 'sortBy', 'sortOrder']);
    const unknownParams: string[] = [];
    for (const key of Array.from(searchParams.keys())) {
      if (!allowedParams.has(key)) {
        unknownParams.push(key);
      }
    }
    if (unknownParams.length > 0) {
      return NextResponse.json({ error: `Unsupported filters: ${unknownParams.join(', ')}` }, { status: 400 });
    }

    // Build filters (none currently supported beyond soft-delete and search)
    const filters: any = {};

    // Get paginated data
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.user,
      'user',
      {
        page,
        pageSize,
        search,
        filters,
        sortBy,
        sortOrder,
      }
    );

    // Map users to API response format
    const mappedData = {
      ...result,
      data: mapUsersToApiResponse(result.data as any[]),
    };

    // Log the action
    await logAdminAction(adminUser, 'user_list_view', 'user', {
      metadata: { page, pageSize, search, filters },
      whitelistFields: AUDIT_FIELD_ALLOWLISTS.USER,
    });

    return NextResponse.json(mappedData);
  } catch (error) {
    adminLogger.error('User list error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    // Do not allow client-provided ID on create
    if (body && 'id' in body) {
      delete body.id;
    }

    // Validate data
    const validatedData = validationUtils.validateUser(body);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Map API request to Prisma format
    const userData = mapApiRequestToUser(sanitizedData);

    // Ensure required id and timestamps
    const now = new Date();
    if (!userData.id) {
      userData.id = uuidv4();
    }
    userData.createdat = userData.createdat || now;
    userData.updatedat = userData.updatedat || now;

    // Ensure email is unique
    const existing = await prisma.user.findUnique({ where: { email: userData.email } as any });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // Create user
    const user = await AdminDatabaseService.createRecord(
      prisma.user,
      'user',
      userData,
      adminUser,
      'user'
    );

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    adminLogger.error('User create error', { error: String(error) });
    
    // Handle ZodError with instanceof check for better reliability
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this information already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
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

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check for role changes and enforce RBAC
    if (data.issuperadmin !== undefined || data.adminRole !== undefined) {
      // Only super admins can change admin roles
      if (!hasPermission(adminUser, ADMIN_PERMISSIONS.ROLE_EDIT) && adminUser.adminRole !== 'super_admin') {
        return NextResponse.json({ error: 'Insufficient permissions to modify admin roles' }, { status: 403 });
      }
    }

    // Validate data
    const validatedData = validationUtils.validateUserUpdate(data);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Map API request to Prisma format
    const userData = mapApiRequestToUser(sanitizedData);

    // Update user
    const user = await AdminDatabaseService.updateRecord(
      prisma.user,
      'user',
      id,
      userData,
      adminUser,
      'user'
    );

    return NextResponse.json({ data: user });
  } catch (error) {
    adminLogger.error('User update error', { error: String(error) });
    
    // Handle ZodError with instanceof check for better reliability
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint violations and not found errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'User with this information already exists' },
          { status: 409 }
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
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

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Get user ID from query params (deprecated)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.warn('[DEPRECATED] Use DELETE /api/admin/users/{id} instead of query param id');

    // Prevent self-deletion
    if (id === adminUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete user (soft delete)
    await AdminDatabaseService.deleteRecord(
      prisma.user,
      'user',
      id,
      adminUser,
      'user',
      true // soft delete
    );

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    adminLogger.error('User delete error', { error: String(error) });
    
    // Handle Prisma not found errors
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
