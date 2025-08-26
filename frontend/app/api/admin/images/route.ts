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
    const restaurantId = searchParams.get('restaurantId') ? parseInt(searchParams.get('restaurantId')!) : undefined;

    // Build filters
    const filters: any = {};
    if (restaurantId) filters.restaurant_id = restaurantId;

    // Get paginated data with restaurant information
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.restaurantImage,
      {
        page,
        pageSize,
        search,
        filters,
        sortBy,
        sortOrder,
      },
      {
        restaurant: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      }
    );

    // Log the action
    await logAdminAction(adminUser, 'image_list_view', 'restaurant_image', {
      metadata: { page, pageSize, search, filters },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ADMIN] Image list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
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
    const validatedData = validationUtils.validateRestaurantImage(body);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Create image record
    const image = await AdminDatabaseService.createRecord(
      prisma.restaurantImage,
      sanitizedData,
      adminUser,
      'restaurant_image'
    );

    return NextResponse.json({ data: image }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN] Image create error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create image record' },
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
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Validate data
    const validatedData = validationUtils.validateRestaurantImage(data);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Update image record
    const image = await AdminDatabaseService.updateRecord(
      prisma.restaurantImage,
      id,
      sanitizedData,
      adminUser,
      'restaurant_image'
    );

    return NextResponse.json({ data: image });
  } catch (error) {
    console.error('[ADMIN] Image update error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update image record' },
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

    // Get image ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Delete image record (soft delete)
    await AdminDatabaseService.deleteRecord(
      prisma.restaurantImage,
      id,
      adminUser,
      'restaurant_image',
      true // soft delete
    );

    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] Image delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
