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
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const affiliation = searchParams.get('affiliation') || undefined;

    // Build filters
    const filters: any = {};
    if (city) filters.city = city;
    if (state) filters.state = state;
    if (affiliation) filters.affiliation = affiliation;

    // Get paginated data
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.floridaSynagogue,
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
    await logAdminAction(adminUser, 'synagogue_list_view', 'florida_synagogue', {
      metadata: { page, pageSize, search, filters },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ADMIN] Synagogue list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch synagogues' },
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
    const validatedData = validationUtils.validateFloridaSynagogue(body);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Create synagogue
    const synagogue = await AdminDatabaseService.createRecord(
      prisma.floridaSynagogue,
      sanitizedData,
      adminUser,
      'florida_synagogue'
    );

    return NextResponse.json({ data: synagogue }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN] Synagogue create error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create synagogue' },
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
      return NextResponse.json({ error: 'Synagogue ID is required' }, { status: 400 });
    }

    // Validate data
    const validatedData = validationUtils.validateFloridaSynagogue(data);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Update synagogue
    const synagogue = await AdminDatabaseService.updateRecord(
      prisma.floridaSynagogue,
      id,
      sanitizedData,
      adminUser,
      'florida_synagogue'
    );

    return NextResponse.json({ data: synagogue });
  } catch (error) {
    console.error('[ADMIN] Synagogue update error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: validationUtils.formatValidationErrors(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update synagogue' },
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

    // Get synagogue ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Synagogue ID is required' }, { status: 400 });
    }

    // Delete synagogue (soft delete)
    await AdminDatabaseService.deleteRecord(
      prisma.floridaSynagogue,
      id,
      adminUser,
      'florida_synagogue',
      true // soft delete
    );

    return NextResponse.json({ message: 'Synagogue deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] Synagogue delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete synagogue' },
      { status: 500 }
    );
  }
}
