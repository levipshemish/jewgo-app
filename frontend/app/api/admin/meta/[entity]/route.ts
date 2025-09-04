import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { errorResponses } from '@/lib';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.DEFAULT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }

    // Validate entity type
    const validEntities = ['restaurant', 'review', 'user', 'restaurantImage', 'marketplace'];
    if (!validEntities.includes(entity)) {
      return errorResponses.badRequest();
    }

    // Get valid sort fields for the entity
    const validSortFields = AdminDatabaseService.getValidSortFields(entity as any);
    const searchFields = AdminDatabaseService.getSearchFields(entity as any);
    const defaultSortField = AdminDatabaseService.getDefaultSortField(entity as any);
    const supportsSoftDelete = AdminDatabaseService.supportsSoftDelete(entity as any);

    return NextResponse.json({
      entity,
      validSortFields,
      searchFields,
      defaultSortField,
      supportsSoftDelete
    });
  } catch (error) {
    console.error('[ADMIN] Meta endpoint error:', error);
    return errorResponses.internalError();
  }
}
