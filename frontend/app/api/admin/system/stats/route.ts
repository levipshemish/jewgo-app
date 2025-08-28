import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { AdminDatabaseService } from '@/lib/admin/database';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { AdminErrors } from '@/lib/admin/errors';

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
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_VIEW)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Get database stats
    const stats = await AdminDatabaseService.getDatabaseStats();

    return NextResponse.json(stats);

  } catch (error) {
    console.error('[ADMIN] Get system stats error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to get system stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}
