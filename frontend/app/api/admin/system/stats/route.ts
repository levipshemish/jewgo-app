import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { AdminDatabaseService } from '@/lib/admin/database';
import { logAdminAction } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Get database statistics
    const dbStats = await AdminDatabaseService.getDatabaseStats();
    
    // Get table sizes for performance monitoring
    const tableSizes = await AdminDatabaseService.getTableSizes();
    
    // Get database health status
    const healthStatus = await AdminDatabaseService.healthCheck();

    // Calculate additional metrics
    // Optional network probe
    let networkStatus: 'ok' | 'error' | 'skipped' = 'skipped';
    const probeUrl = process.env.HEALTHCHECK_NETWORK_PROBE_URL;
    if (probeUrl) {
      try {
        const res = await fetch(probeUrl, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
        networkStatus = res.ok ? 'ok' : 'error';
      } catch {
        networkStatus = 'error';
      }
    }

    const stats = {
      ...dbStats,
      tableSizes,
      healthStatus: {
        ...healthStatus,
        supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        redisConfigured: Boolean(process.env.UPSTASH_REDIS_REST_URL),
        network: networkStatus,
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
      performance: {
        pendingSubmissions: dbStats.pendingSubmissions,
        approvalRate: dbStats.totalRestaurants > 0 
          ? ((dbStats.totalRestaurants - dbStats.pendingSubmissions) / dbStats.totalRestaurants * 100).toFixed(2)
          : '0.00',
        averageRating: dbStats.totalReviews > 0 
          ? (dbStats.totalReviews / dbStats.totalRestaurants).toFixed(2)
          : '0.00',
      },
    };

    // Log the action
    await logAdminAction(adminUser, 'system_stats_view', 'system', {
      metadata: {
        action: 'view_stats',
        statsSummary: {
          totalRestaurants: stats.totalRestaurants,
          totalReviews: stats.totalReviews,
          totalUsers: stats.totalUsers,
          pendingSubmissions: stats.pendingSubmissions,
        },
      },
    });

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('[ADMIN] System stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system statistics' },
      { status: 500 }
    );
  }
}
