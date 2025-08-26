import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, validateCSRFToken, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';
import { mapUsersToApiResponse, mapApiRequestToUser } from '@/lib/admin/dto/user';

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
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const provider = searchParams.get('provider') || undefined;

    // Build filters
    const filters: any = {};
    if (provider) filters.provider = provider;

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
    });

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error('[ADMIN] User list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || !validateCSRFToken(csrfToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Parse request body
    const body = await request.json();

    // Validate data
    const validatedData = validationUtils.validateUser(body);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Map API request to Prisma format
    const userData = mapApiRequestToUser(sanitizedData);

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
    console.error('[ADMIN] User create error:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error as any) },
        { status: 400 }
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
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || !validateCSRFToken(csrfToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Parse request body
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate data
    const validatedData = validationUtils.validateUser(data);

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
    console.error('[ADMIN] User update error:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error as any) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.USER_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || !validateCSRFToken(csrfToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

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
    console.error('[ADMIN] User delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
