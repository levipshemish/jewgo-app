import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction, ENTITY_TYPES, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { AdminErrors, handlePrismaError } from '@/lib/admin/errors';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_VIEW)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '20');
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const status = searchParams.get('status') || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;

    // Build filters
    const filters: any = {};
    if (status && status !== 'all') {
      // Map status to submission_status if it's a submission-related status
      if (['pending_approval', 'approved', 'rejected'].includes(status)) {
        filters.submission_status = status;
      } else {
        filters.status = status;
      }
    }
    if (city) {filters.city = city;}
    if (state) {filters.state = state;}

    adminLogger.info('Fetching restaurants with filters', { page, pageSize, search, sortBy, sortOrder, status, city, state });

    // Get paginated data
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.restaurant,
      'restaurant',
      {
        page,
        pageSize,
        search,
        filters,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      }
    );

    adminLogger.info('Successfully fetched restaurants', { count: result.data.length, total: result.pagination.total });

    // Log the action
    await logAdminAction(adminUser, 'restaurant_list_view', ENTITY_TYPES.RESTAURANT, {
      metadata: { page, pageSize, search, filters },
      whitelistFields: AUDIT_FIELD_ALLOWLISTS.RESTAURANT,
    });

    return NextResponse.json(result);
  } catch (error) {
    adminLogger.error('Restaurant list error', { error: String(error) });
    
    // Use centralized error handling
    if (error && typeof error === 'object' && 'code' in error) {
      return handlePrismaError(error);
    }
    
    return AdminErrors.INTERNAL_ERROR(`Failed to fetch restaurants: ${error instanceof Error ? error.message : String(error)}`);
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();

    // Validate data (create operation)
    const validatedData = validationUtils.validateRestaurant(body, false);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Ensure required timestamps
    const now = new Date();
    const toCreate = {
      ...sanitizedData,
      created_at: sanitizedData.created_at ?? now,
      updated_at: sanitizedData.updated_at ?? now,
      submission_date: sanitizedData.submission_date ?? now,
    };

    // Create restaurant
    const restaurant = await AdminDatabaseService.createRecord(
      prisma.restaurant,
      'restaurant',
      toCreate,
      adminUser,
      'restaurant'
    );

    return NextResponse.json({ data: restaurant }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN] Restaurant create error:', error);
    
    if ((error as any).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error as any) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create restaurant' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Deprecation warning for query parameter usage
  console.warn('[ADMIN] PUT /api/admin/restaurants is deprecated. Use PUT /api/admin/restaurants/[id] instead.');
  
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_EDIT)) {
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
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    // Validate data (update operation)
    const validatedData = validationUtils.validateRestaurant(data, true);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Update restaurant
    const restaurant = await AdminDatabaseService.updateRecord(
      prisma.restaurant,
      'restaurant',
      id,
      sanitizedData,
      adminUser,
      'restaurant'
    );

    return NextResponse.json({ data: restaurant });
  } catch (error) {
    console.error('[ADMIN] Restaurant update error:', error);
    
    if ((error as any).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error as any) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update restaurant' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Deprecation warning for query parameter usage
  console.warn('[ADMIN] DELETE /api/admin/restaurants?id=X is deprecated. Use DELETE /api/admin/restaurants/[id] instead.');
  
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Get restaurant ID from query params (deprecated)
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    if (!idParam || isNaN(Number(idParam))) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.warn('[DEPRECATED] Use DELETE /api/admin/restaurants/{id} instead of query param id');
    const id = Number(idParam);

    // Delete restaurant (soft delete)
    await AdminDatabaseService.deleteRecord(
      prisma.restaurant,
      'restaurant',
      id,
      adminUser,
      'restaurant',
      true // soft delete
    );

    return NextResponse.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] Restaurant delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete restaurant' },
      { status: 500 }
    );
  }
}
