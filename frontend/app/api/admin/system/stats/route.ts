import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { getAuditStats } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get database statistics
    const dbStats = await AdminDatabaseService.getDatabaseStats();

    // Get audit statistics
    const auditStats = await getAuditStats();

    // Get system health information
    const healthCheck = await AdminDatabaseService.healthCheck();

    // Get table sizes
    const tableSizes = await AdminDatabaseService.getTableSizes();

    return NextResponse.json({
      database: dbStats,
      audit: auditStats,
      health: healthCheck,
      tableSizes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] System stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system statistics' },
      { status: 500 }
    );
  }
}
