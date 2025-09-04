import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { AdminDatabaseService } from '@/lib/admin/database';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { errorResponses, createSuccessResponse } from '@/lib';

export async function GET(request: NextRequest) {
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

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_VIEW)) {
      return errorResponses.insufficientPermissions();
    }

    // Get database stats
    const stats = await AdminDatabaseService.getDatabaseStats();

    return createSuccessResponse(stats);

  } catch (error) {
    console.error('[ADMIN] Get system stats error:', error);
    return errorResponses.internalError(`Failed to get system stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}
