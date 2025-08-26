import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { validationUtils } from '@/lib/admin/validation';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;

    // Build filters
    const filters: any = {};
    if (category) filters.category = category;
    if (status) filters.status = status;

    // Get paginated data
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.kosherPlace,
      {
        page,
        pageSize,
        search,
        filters,
        sortBy,
        sortOrder,
      }
    );

    // Log the action
    await logAdminAction(adminUser, 'kosher_place_list_view', 'kosher_place', {
      metadata: { page, pageSize, search, filters },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ADMIN] Kosher place list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kosher places' },
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

    // Parse request body
    const body = await request.json();

    // Validate data
    const validatedData = validationUtils.validateKosherPlace(body);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Create kosher place
    const kosherPlace = await AdminDatabaseService.createRecord(
      prisma.kosherPlace,
      sanitizedData,
      adminUser,
      'kosher_place'
    );

    return NextResponse.json({ data: kosherPlace }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN] Kosher place create error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create kosher place' },
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
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Kosher place ID is required' }, { status: 400 });
    }

    // Validate data
    const validatedData = validationUtils.validateKosherPlace(data);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Update kosher place
    const kosherPlace = await AdminDatabaseService.updateRecord(
      prisma.kosherPlace,
      id,
      sanitizedData,
      adminUser,
      'kosher_place'
    );

    return NextResponse.json({ data: kosherPlace });
  } catch (error) {
    console.error('[ADMIN] Kosher place update error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update kosher place' },
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

    // Get kosher place ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Kosher place ID is required' }, { status: 400 });
    }

    // Delete kosher place (soft delete)
    await AdminDatabaseService.deleteRecord(
      prisma.kosherPlace,
      id,
      adminUser,
      'kosher_place',
      true // soft delete
    );

    return NextResponse.json({ message: 'Kosher place deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] Kosher place delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete kosher place' },
      { status: 500 }
    );
  }
}
