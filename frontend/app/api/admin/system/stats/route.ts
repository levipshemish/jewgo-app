import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get aggregated stats
    const [
      totalUsers,
      totalRestaurants,
      totalReviews,
      pendingApprovals
    ] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count({ where: { deleted_at: null } }),
      prisma.review.count(),
      prisma.restaurant.count({ 
        where: { 
          submission_status: 'pending_approval',
          deleted_at: null 
        } 
      })
    ]);

    // Mock data for non-existent models
    const totalSynagogues = 0;
    const totalKosherPlaces = 0;

    // Calculate system health (simplified)
    const systemHealth = pendingApprovals > 100 ? 'warning' : 'healthy';

    // Get uptime (simplified - in production, use actual uptime tracking)
    const uptime = '24h 15m 30s'; // This would come from actual uptime tracking

    // Get active sessions (simplified)
    const activeSessions = Math.floor(Math.random() * 50) + 10; // Mock data

    // Get last backup time (simplified)
    const lastBackup = new Date().toISOString();

    const stats = {
      totalUsers,
      totalRestaurants,
      totalReviews,
      totalSynagogues,
      totalKosherPlaces,
      pendingApprovals,
      systemHealth,
      lastBackup,
      uptime,
      activeSessions
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('[ADMIN] System stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system stats' },
      { status: 500 }
    );
  }
}
