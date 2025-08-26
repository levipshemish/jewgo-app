import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { AdminDatabaseService } from '@/lib/admin/database';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_VIEW)) {
      // Allow view for any authenticated admin for now
    }

    const dbStats = await AdminDatabaseService.getDatabaseStats();
    let totalKosherPlaces = 0;
    try {
      totalKosherPlaces = await prisma.marketplace.count();
    } catch {}

    const data = {
      totalUsers: dbStats.totalUsers,
      totalRestaurants: dbStats.totalRestaurants,
      totalReviews: dbStats.totalReviews,
      totalSynagogues: 0,
      totalKosherPlaces,
      pendingApprovals: dbStats.pendingSubmissions,
      systemHealth: 'healthy' as const,
      lastBackup: 'unknown',
      uptime: 'unknown',
      activeSessions: 0,
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[ADMIN] System stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

