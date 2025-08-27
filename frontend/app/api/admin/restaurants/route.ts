import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test database connection first
    try {
      await prisma.$connect();
      console.log('[ADMIN] Database connection successful');
    } catch (dbError) {
      console.error('[ADMIN] Database connection failed:', dbError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
      }, { status: 503 });
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const status = searchParams.get('status') || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;

    // Build filters
    const filters: any = {};
    if (status) {
      // Map status to submission_status if it's a submission-related status
      if (['pending_approval', 'approved', 'rejected'].includes(status)) {
        filters.submission_status = status;
      } else {
        filters.status = status;
      }
    }
    if (city) {filters.city = city;}
    if (state) {filters.state = state;}

    console.log('[ADMIN] Fetching restaurants with filters:', { page, pageSize, search, sortBy, sortOrder, status, city, state });

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

    console.log('[ADMIN] Successfully fetched restaurants:', { count: result.data.length, total: result.pagination.total });

    // Log the action
    await logAdminAction(adminUser, 'restaurant_list_view', 'restaurant', {
      metadata: { page, pageSize, search, filters },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ADMIN] Restaurant list error:', error);
    
    // Provide more detailed error information in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to fetch restaurants: ${error instanceof Error ? error.message : String(error)}`
      : 'Failed to fetch restaurants';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  } finally {
    // Always disconnect from database
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('[ADMIN] Error disconnecting from database:', disconnectError);
    }
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
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
  try {
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
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
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
  try {
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
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Get restaurant ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

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
