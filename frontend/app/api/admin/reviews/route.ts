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
import { v4 as uuidv4 } from 'uuid';
import { handleRoute, json } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const adminUser = await requireAdminOrThrow(request);
    
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.REVIEW_VIEW)) {
      return json({ error: 'Insufficient permissions' }, 403);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const result = await AdminDatabaseService.getPaginatedData(
      prisma.review,
      'review',
      {
        page,
        pageSize,
        search,
        sortBy,
        sortOrder,
      }
    );

    return json(result);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdminOrThrow(request);

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.REVIEW_MODERATE)) {
      return json({ error: 'Insufficient permissions' }, 403);
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return json({ error: 'Forbidden', code: 'CSRF' }, 403);
    }

    // Parse request body
    const body = await request.json();

    // Validate data (create operation)
    const validatedData = validationUtils.validateReview(body, false);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Prepare required fields
    const now = new Date();
    const toCreate = {
      id: uuidv4(),
      ...sanitizedData,
      created_at: sanitizedData.created_at ?? now,
      updated_at: sanitizedData.updated_at ?? now,
    };

    // Create review
    const review = await AdminDatabaseService.createRecord(
      prisma.review,
      'review',
      toCreate,
      adminUser,
      'review',
      false
    );

    // Log admin action
    await logAdminAction(
      adminUser.id,
      'CREATE',
      ENTITY_TYPES.REVIEW,
      review.id,
      toCreate,
      AUDIT_FIELD_ALLOWLISTS.REVIEW
    );

    return json({ success: true, data: review });
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdminOrThrow(request);

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.REVIEW_MODERATE)) {
      return json({ error: 'Insufficient permissions' }, 403);
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return json({ error: 'Forbidden', code: 'CSRF' }, 403);
    }

    // Parse request body
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return json({ error: 'Review ID is required' }, 400);
    }

    // Validate data (update operation)
    const validatedData = validationUtils.validateReview(data, true);

    // Sanitize data
    const sanitizedData = validationUtils.sanitizeData(validatedData);

    // Update review
    const review = await AdminDatabaseService.updateRecord(
      prisma.review,
      'review',
      id,
      sanitizedData,
      adminUser,
      'review'
    );

    return json({ data: review });
  });
}

export async function DELETE(request: NextRequest) {
  return handleRoute(async () => {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdminOrThrow(request);

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.REVIEW_DELETE)) {
      return json({ error: 'Insufficient permissions' }, 403);
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return json({ error: 'Forbidden', code: 'CSRF' }, 403);
    }

    // Get review ID from query params (deprecated)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return json({ error: 'Review ID is required' }, 400);
    }
    // eslint-disable-next-line no-console
    console.warn('[DEPRECATED] Use DELETE /api/admin/reviews/{id} instead of query param id');

    // Check if review exists before deleting
    const existingReview = await prisma.review.findUnique({
      where: { id },
      select: { id: true, title: true, restaurant_id: true }
    });

    if (!existingReview) {
      return json({ error: 'Review not found' }, 404);
    }

    // Delete review (hard delete)
    await AdminDatabaseService.deleteRecord(
      prisma.review,
      'review',
      id,
      adminUser,
      'review',
      false // hard delete
    );

    return json({ message: 'Review deleted successfully' });
  });
}
