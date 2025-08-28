import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction, ENTITY_TYPES, AUDIT_ACTIONS, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { AdminErrors } from '@/lib/admin/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_VIEW)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Parse and validate restaurant ID
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return AdminErrors.INVALID_ID('Restaurant ID must be a valid number');
    }

    // Get restaurant data
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      return AdminErrors.NOT_FOUND('Restaurant not found');
    }

    return NextResponse.json({ data: restaurant });

  } catch (error) {
    console.error('[ADMIN] Get restaurant error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to get restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_EDIT)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return AdminErrors.CSRF_ERROR();
    }

    // Parse and validate restaurant ID
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return AdminErrors.INVALID_ID('Restaurant ID must be a valid number');
    }

    // Parse request body
    const body = await request.json();

    // Update restaurant using AdminDatabaseService
    const updatedRestaurant = await AdminDatabaseService.updateRecord(
      prisma.restaurant,
      'restaurant',
      id,
      body,
      adminUser,
      'restaurant'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Restaurant updated successfully',
      data: updatedRestaurant 
    });

  } catch (error) {
    console.error('[ADMIN] Update restaurant error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to update restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.RESTAURANT_DELETE)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return AdminErrors.CSRF_ERROR();
    }

    // Parse and validate restaurant ID
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return AdminErrors.INVALID_ID('Restaurant ID must be a valid number');
    }

    // Delete restaurant using AdminDatabaseService (soft delete)
    await AdminDatabaseService.deleteRecord(
      prisma.restaurant,
      'restaurant',
      id,
      adminUser,
      'restaurant',
      true // soft delete
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Restaurant deleted successfully' 
    });

  } catch (error) {
    console.error('[ADMIN] Delete restaurant error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to delete restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}
